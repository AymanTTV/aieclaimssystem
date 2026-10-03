// src/components/finance/InvoiceTable.tsx
import React, { useMemo, useState } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Invoice, Vehicle, Customer } from '../../types/finance';
import { Eye, FileText, Edit, Trash2, CreditCard, FileSignature, Briefcase, MessageCircle, Mail } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import InvoiceCommunicationModal from './InvoiceCommunicationModal';

import { derivePaymentStatus } from '../../utils/paymentStatusHelper';

interface InvoiceTableProps {
  invoices: Invoice[];
  vehicles: Vehicle[];
  customers: Customer[];
  accounts?: any[];
  groups?: { id: string; name: string }[];
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onApplyDiscount: (invoice: Invoice) => void;
  onDeletePayment: (invoice: Invoice, paymentId: string) => void;
  onGenerateDocument: (invoice: Invoice) => void;
  onViewDocument: (invoice: Invoice) => void;
  onAssignDepartment: (invoice: Invoice) => void; // NEW
  onStatusChange?: (invoice: Invoice, newStatus: string) => void;
  
  isManager: boolean;
  selectedIds: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string) => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices, vehicles, customers, accounts = [], groups = [], onView, onEdit, onDelete, onDownload,
  onRecordPayment, onApplyDiscount, onDeletePayment, onGenerateDocument,
  onViewDocument, onAssignDepartment, isManager, selectedIds, onToggleAll, onToggleOne,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const formatDateValue = (date: any): string => {
    if (date?.toDate) return format(date.toDate(), 'dd/MM/yyyy');
    if (date instanceof Date) return format(date, 'dd/MM/yyyy');
    return 'N/A';
  };

  const isOverdue = (invoice: Invoice): boolean => {
    const hasPayments = Array.isArray(invoice.payments);
    const paymentsSum = hasPayments
      ? (invoice.payments || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
      : 0;
    const paid = hasPayments
      ? paymentsSum
      : Math.max(0, Number(invoice.paidAmount ?? invoice.paid ?? 0));
    const billed = Math.max(0, Number(invoice.customerBilled ?? invoice.total ?? invoice.amount ?? 0));
    const owing = hasPayments
      ? Math.max(0, Number((billed - paid).toFixed(2)))
      : (invoice.remainingAmount !== undefined && invoice.remainingAmount !== null ? Number(invoice.remainingAmount) : Math.max(0, Number((billed - paid).toFixed(2))));

    const dueDateObj = (invoice.dueDate as any)?.toDate ? (invoice.dueDate as any).toDate() : new Date(invoice.dueDate);
    return owing > 0.001 && !isNaN(dueDateObj.getTime()) && new Date() > dueDateObj;
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    const aOver = isOverdue(a);
    const bOver = isOverdue(b);
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    
    const getSafeTime = (d: any) => {
      if (!d) return 0;
      if (d instanceof Date) return d.getTime();
      if (d.toDate) return d.toDate().getTime();
      return new Date(d).getTime() || 0;
    };
    
    return getSafeTime(b.date) - getSafeTime(a.date);
  });

  const allSelected = sortedInvoices.length > 0 && selectedIds.size === sortedInvoices.length;
  const someSelected = sortedInvoices.length > 0 && selectedIds.size > 0 && !allSelected;

  const [commModal, setCommModal] = useState<{
    isOpen: boolean;
    mode: 'whatsapp' | 'email';
    invoice: Invoice | null;
  }>({
    isOpen: false,
    mode: 'whatsapp',
    invoice: null,
  });

  const ActionBtn = ({ onClick, icon: Icon, colorClass, title }: { onClick: (e: React.MouseEvent) => void, icon: any, colorClass: string, title: string }) => (
    <button 
      onClick={e => { e.stopPropagation(); onClick(e); }} 
      title={title}
      className={`p-1.5 rounded-md hover:bg-gray-50 hover:shadow-sm transition-all flex items-center justify-center w-8 h-8 ${colorClass}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  const handleWhatsApp = (inv: Invoice) => {
    setCommModal({
      isOpen: true,
      mode: 'whatsapp',
      invoice: inv,
    });
  };

  const handleEmail = (inv: Invoice) => {
    setCommModal({
      isOpen: true,
      mode: 'email',
      invoice: inv,
    });
  };

  const columns = useMemo(() => {
    const cols = [
      {
        id: 'select',
        header: (
          <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary" checked={allSelected} ref={(input) => { if (input) input.indeterminate = someSelected; }} onChange={(e) => onToggleAll(e.target.checked)} />
        ),
        cell: ({ row }: any) => (
          <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary" checked={selectedIds.has(row.original.id)} onChange={() => onToggleOne(row.original.id)} onClick={(e) => e.stopPropagation()} />
        ),
      },
      {
          header: 'Order / Invoice Ref',
          cell: ({ row }: any) => {
            const invNum = row.original.invoiceNumber;
            const ordNum = row.original.orderNumber || row.original.orderId;
            const refId = row.original.referenceId;
            const showRef = refId && refId !== ordNum && refId !== invNum;

            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {invNum ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
                      <FileText className="w-3 h-3 mr-1 text-indigo-600 shrink-0" />
                      #{invNum}
                    </span>
                  ) : (
                    <span className="text-gray-400 font-mono text-xs">N/A</span>
                  )}
                  {ordNum && ordNum !== invNum && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      Ord: {ordNum}
                    </span>
                  )}
                  {showRef && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-200">
                      Ref: {refId.slice(-6).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            );
          },
      },
      {
        header: 'Customer',
        cell: ({ row }: any) => {
          let content = <span className="text-gray-500">No customer</span>;
          if (row.original.customerName) {
            content = (
              <div>
                <div className="font-medium">{row.original.customerName}</div>
                {row.original.customerPhone && <div className="text-sm text-gray-500">{row.original.customerPhone}</div>}
              </div>
            );
          } else {
            const cust = customers.find(c => c.id === row.original.customerId);
            if (cust) {
              content = (
                <div>
                  <div className="font-medium">{cust.name}</div>
                  <div className="text-sm text-gray-500">{cust.mobile}</div>
                </div>
              );
            }
          }
          return (
            <div>
              {content}
            </div>
          );
        },
      },
      {
        header: 'Vehicle & Account',
        cell: ({ row }: { row: { original: Invoice } }) => {
          const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
          const regNumber = vehicle?.registrationNumber;
          const fullDetails = row.original.vehicleName || (vehicle ? `${vehicle.make} ${vehicle.model} (${regNumber})` : '');

          const accId = row.original.accountFrom || row.original.accountTo || vehicle?.owner?.accountId;
          const assignedAccount = accounts.find(a => a.id === accId);
          const accountName = assignedAccount?.name || vehicle?.owner?.name;
          const groupName = row.original.groupName || (row.original.groupId ? groups.find(g => g.id === row.original.groupId)?.name : undefined) || vehicle?.assignedGroupName;
          const deptName = row.original.departmentName || vehicle?.assignedDepartmentName;

          return (
            <div className="flex flex-col gap-1 min-w-[130px]">
              {regNumber ? (
                <div className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-gray-800 w-fit" title={fullDetails}>
                  {regNumber}
                </div>
              ) : row.original.vehicleName ? (
                <div className="text-xs font-semibold text-gray-800" title={row.original.vehicleName}>
                  {row.original.vehicleName}
                </div>
              ) : (
                <span className="text-gray-400 text-xs">No Vehicle</span>
              )}

              {accountName && (
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 w-fit font-medium truncate max-w-[160px]" title={`Pre-assigned Account: ${accountName}`}>
                  Acc: {accountName}
                </span>
              )}
              {deptName && (
                <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100 w-fit font-medium truncate max-w-[160px]" title={`Department: ${deptName}`}>
                  Dept: {deptName}
                </span>
              )}
              {groupName && !accountName && (
                <span className="text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 w-fit font-medium truncate max-w-[160px]">
                  Grp: {groupName}
                </span>
              )}
            </div>
          );
        },
      },
      { 
        header: 'Type',
        cell: ({ row }: any) => {
          if (row.original.isLoan) {
            return (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full border text-rose-800 bg-rose-100 border-rose-200">
                Loan (Expense)
              </span>
            );
          }
          return <span className="text-gray-400 text-sm">-</span>;
        },
      },
      {
        header: 'Due Date',
        cell: ({ row }: any) => (
          <span className="text-sm text-gray-900">{formatDateValue(row.original.dueDate)}</span>
        ),
      },
      {
        header: 'Status',
        cell: ({ row }: any) => {
          const inv = row.original;
          const hasPayments = Array.isArray(inv.payments);
          const paymentsSum = hasPayments
            ? (inv.payments || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
            : 0;
          const paid = hasPayments
            ? paymentsSum
            : Math.max(0, Number(inv.paidAmount ?? inv.paid ?? 0));
          const billed = Math.max(0, Number(inv.customerBilled ?? inv.total ?? inv.amount ?? 0));
          const owing = hasPayments
            ? Math.max(0, Number((billed - paid).toFixed(2)))
            : (inv.remainingAmount !== undefined && inv.remainingAmount !== null ? Number(inv.remainingAmount) : Math.max(0, Number((billed - paid).toFixed(2))));

          // Dynamic Status Calculation: Derive status from owing/paid synced with payment history
          const displayStatus = derivePaymentStatus({
            customerBilled: billed,
            total: billed,
            amount: billed,
            paidAmount: paid,
            paid: paid,
            remainingAmount: owing,
            owing: owing,
            payments: inv.payments
          });

          const overdue = isOverdue(inv);
          const currentStatus = overdue && displayStatus !== 'paid' ? 'overdue' : displayStatus;
          return <StatusBadge status={currentStatus} />;
        },
      },
      {
        header: 'Category',
        cell: ({ row }: any) => (
          <span className="capitalize font-medium text-sm text-gray-700">
            {row.original.category === 'Other' ? row.original.customCategory : row.original.category}
          </span>
        ),
      },
      {
        header: 'Cost Breakdown',
        cell: ({ row }: any) => {
          const inv = row.original;
          const hasPayments = Array.isArray(inv.payments);
          const paymentsSum = hasPayments
            ? (inv.payments || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
            : 0;
          const paid = hasPayments
            ? paymentsSum
            : Math.max(0, Number(inv.paidAmount ?? inv.paid ?? 0));
          const billed = Math.max(0, Number(inv.customerBilled !== undefined ? inv.customerBilled : (inv.total || inv.amount || 0)));
          const owing = hasPayments
            ? Math.max(0, Number((billed - paid).toFixed(2)))
            : (inv.remainingAmount !== undefined && inv.remainingAmount !== null ? Number(inv.remainingAmount) : Math.max(0, Number((billed - paid).toFixed(2))));

          let sub = inv.subcontractorCost !== undefined ? Number(inv.subcontractorCost) : 0;
          if (sub <= 0 && Array.isArray(inv.lineItems)) {
            sub = inv.lineItems.reduce((acc: number, li: any) => acc + (Number(li.subcontractorCost) || 0), 0);
          }
          const billedTotal = billed;
          const netProfit = inv.netProfit !== undefined ? Number(inv.netProfit) : (billedTotal - sub);
          const margin = inv.profitMarginPercent !== undefined ? Number(inv.profitMarginPercent) : (billedTotal > 0 ? (netProfit / billedTotal) * 100 : 0);
          const hasSub = sub > 0;

          // Standardized Cost Breakdown Color System:
          // Billed Total: Orange (text-amber-600) if Owing > £0 (Awaiting Payment); Green (text-emerald-600) if Paid == Billed Total (Fully Collected)
          const isFullyCollected = billedTotal > 0 && paid >= billedTotal - 0.001;
          const billedColorClass = isFullyCollected ? 'text-emerald-600' : 'text-amber-600';

          return (
            <div className="text-sm space-y-0.5 min-w-[130px]">
              {/* Billed Total: Orange if Owing > £0, Green if Paid == Billed Total */}
              <div className={`flex justify-between font-bold border-b border-gray-100 pb-0.5 ${billedColorClass}`}>
                <span>Billed Total:</span>
                <span className="font-mono">{formatCurrency(billedTotal)}</span>
              </div>

              {/* Paid: Green (text-emerald-600) for all settled payment amounts (> £0.00), Muted Gray if £0.00 */}
              <div className={`flex justify-between text-xs ${paid > 0.001 ? 'text-emerald-600 font-bold' : 'text-gray-400 font-normal'}`}>
                <span>Paid:</span>
                <span className="font-mono">{formatCurrency(paid)}</span>
              </div>

              {/* Owing: Red (text-rose-600 / bold) for any unpaid balance remaining (> £0.00), Muted Gray if £0.00 */}
              <div className={`flex justify-between text-xs ${owing > 0.001 ? 'text-rose-600 font-bold' : 'text-gray-400 font-normal'}`}>
                <span>Owing:</span>
                <span className="font-mono">{formatCurrency(owing)}</span>
              </div>

              {hasSub && (
                <>
                  {/* Dealer / Subcontractor Cost: Red (text-rose-500) representing out-of-pocket costs/expenses */}
                  <div className="pt-0.5 border-t border-dashed border-slate-200 flex justify-between text-[11px] font-medium text-slate-500">
                    <span>Dealer Cost:</span>
                    <span className="font-mono font-bold text-rose-500">-{formatCurrency(sub)}</span>
                  </div>

                  {/* Net Profit: Green (text-emerald-600) if Profit > £0.00, Red (text-rose-600) if Profit < £0.00 (Loss) */}
                  <div className="flex justify-between text-[11px] font-bold items-center pt-0.5">
                    <span className={netProfit > 0.001 ? 'text-emerald-600' : netProfit < -0.001 ? 'text-rose-600' : 'text-slate-600'}>Net Profit:</span>
                    <span className={`font-mono ${netProfit > 0.001 ? 'text-emerald-600' : netProfit < -0.001 ? 'text-rose-600' : 'text-slate-600'}`}>
                      {netProfit > 0.001 ? '+' : ''}{formatCurrency(netProfit)}
                    </span>
                  </div>

                  <div className="flex justify-end pt-0.5">
                    <span
                      className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border ${
                        margin > 0.001
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : margin < -0.001
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {margin > 0.001 ? '+' : ''}{margin.toFixed(1)}% Margin
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        },
      },
      {
        header: 'Payment History',
        cell: ({ row }: any) => {
          const payments = [...(row.original.payments || [])]
      .sort((a: any, b: any) => {
        const dateA = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
        const dateB = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
          return payments.length > 0 ? (
            <div className="space-y-1">
              {payments.map((payment: any) => (
                <div key={payment.id} className="text-sm flex items-center justify-between bg-gray-50 p-1.5 rounded">
                  <div>
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
                      {can('invoices', 'delete') && (
                        <button onClick={(e) => { e.stopPropagation(); onDeletePayment(row.original, payment.id); }} className="ml-2 text-red-600 hover:text-red-800" title="Delete Payment"><Trash2 className="h-3 w-3" /></button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                      <span className="mx-1">•</span>
                      <span>{formatDateValue(payment.date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 text-xs font-medium">No payments</span>
          );
        },
      },
      {
        header: 'Actions',
        cell: ({ row }: any) => {
          const inv = row.original;
          
          return (
            <div className="flex flex-col gap-1.5 items-center justify-center py-2 min-w-[100px]">
              
              <div className="flex flex-wrap justify-center gap-1">
                {can('invoices', 'view') && <ActionBtn onClick={() => onView(inv)} icon={Eye} colorClass="text-blue-600" title="View Details" />}
                {can('invoices', 'update') && <ActionBtn onClick={() => onEdit(inv)} icon={Edit} colorClass="text-indigo-600" title="Edit Invoice" />}
                {can('invoices', 'whatsapp') && <ActionBtn onClick={() => handleWhatsApp(inv)} icon={MessageCircle} colorClass="text-green-600 hover:text-green-700" title="Share via WhatsApp" />}
                {can('invoices', 'email') && <ActionBtn onClick={() => handleEmail(inv)} icon={Mail} colorClass="text-sky-600 hover:text-sky-700" title="Send Email" />}
                {can('invoices', 'assign') && <ActionBtn onClick={() => onAssignDepartment(inv)} icon={Briefcase} colorClass="text-teal-600" title="Assign Department" />}
              </div>

              {inv.remainingAmount > 0 && can('invoices', 'recordPayment') && (
                <div className="flex flex-wrap justify-center gap-1 w-full pt-1 border-t border-gray-100">
                  <ActionBtn onClick={() => onRecordPayment(inv)} icon={CreditCard} colorClass="text-emerald-600" title="Record Payment" />
                </div>
              )}

              {can('invoices', 'singleDoc') && (
                <div className="flex flex-wrap justify-center gap-1 w-full pt-1.5 border-t border-gray-100">
                  {inv.documentUrl && <ActionBtn onClick={() => onViewDocument(inv)} icon={FileText} colorClass="text-blue-700" title="View Current Document" />}
                  <ActionBtn onClick={() => onGenerateDocument(inv)} icon={FileSignature} colorClass={inv.documentUrl ? "text-green-600" : "text-blue-600"} title={inv.documentUrl ? "Regenerate New Document" : "Generate Document"} />
                </div>
              )}

              {can('invoices', 'delete') && (
                <div className="flex flex-wrap justify-center gap-1 w-full pt-1">
                  <ActionBtn onClick={() => onDelete(inv)} icon={Trash2} colorClass="text-red-600 hover:bg-red-50" title="Delete Invoice" />
                </div>
              )}
              
            </div>
          );
        },
      },
    ];

    const canSelect = isManager || can('invoices', 'assign') || can('invoices', 'delete');
    if (!canSelect) {
      return cols.filter(c => c.id !== 'select');
    }
    return cols;
  }, [allSelected, someSelected, selectedIds, onToggleAll, onToggleOne, isManager, sortedInvoices, can, formatCurrency, customers]);

  const selectedCustomer = commModal.invoice
    ? customers.find(c => c.id === commModal.invoice?.customerId) || 
      (commModal.invoice.customerName ? customers.find(c => c.name?.toLowerCase() === commModal.invoice?.customerName?.toLowerCase()) : undefined)
    : undefined;

  const selectedVehicle = commModal.invoice
    ? vehicles.find(v => v.id === commModal.invoice?.vehicleId)
    : undefined;

  return (
    <>
      <DataTable
        data={sortedInvoices}
        columns={columns as any}
        onRowClick={(inv) => can('invoices', 'view') && onView(inv)}
        rowClassName={(inv) => (isOverdue(inv) ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500' : 'hover:bg-gray-50')}
      />

      <InvoiceCommunicationModal
        isOpen={commModal.isOpen}
        onClose={() => setCommModal(prev => ({ ...prev, isOpen: false, invoice: null }))}
        invoice={commModal.invoice}
        customer={selectedCustomer}
        vehicle={selectedVehicle}
        initialMode={commModal.mode}
      />
    </>
  );
};

export default InvoiceTable;