// src/components/finance/InvoiceTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Invoice, Vehicle, Customer } from '../../types/finance';
import { Eye, FileText, Edit, Trash2, CreditCard } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface InvoiceTableProps {
  invoices: Invoice[];
  vehicles: Vehicle[];
  customers: Customer[];
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
  onRecordPayment: (invoice: Invoice) => void;
  onApplyDiscount: (invoice: Invoice) => void;
  onDeletePayment: (invoice: Invoice, paymentId: string) => void;
  onGenerateDocument: (invoice: Invoice) => void;
  onViewDocument: (invoice: Invoice) => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  vehicles,
  customers,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onRecordPayment,
  onApplyDiscount,
  onDeletePayment,
  onGenerateDocument,
  onViewDocument,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const formatDateValue = (date: any): string => {
    if (date?.toDate) return format(date.toDate(), 'dd/MM/yyyy');
    if (date instanceof Date) return format(date, 'dd/MM/yyyy');
    return 'N/A';
  };

  const isOverdue = (invoice: Invoice): boolean => {
    const status = invoice.paymentStatus;
    return (status === 'pending' || status === 'partially_paid' || status === 'unpaid') && new Date() > new Date(invoice.dueDate);
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    const aOver = isOverdue(a);
    const bOver = isOverdue(b);
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    
    // Fallback to safe date parsing for sorting
    const getSafeTime = (d: any) => {
      if (!d) return 0;
      if (d instanceof Date) return d.getTime();
      if (d.toDate) return d.toDate().getTime();
      return new Date(d).getTime() || 0;
    };
    
    return getSafeTime(b.date) - getSafeTime(a.date);
  });

  const ActionBtn = ({ 
    onClick, 
    icon: Icon, 
    colorClass, 
    title 
  }: { 
    onClick: (e: React.MouseEvent) => void, 
    icon: any, 
    colorClass: string, 
    title: string 
  }) => (
    <button 
      onClick={e => { e.stopPropagation(); onClick(e); }} 
      title={title}
      className={`p-1.5 rounded-md hover:bg-gray-50 hover:shadow-sm transition-all flex items-center justify-center w-8 h-8 ${colorClass}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  const columns = [
    {
        header: 'Invoice #',
        cell: ({ row }: any) => {
          return (
            <div className="font-medium text-gray-800">
              {row.original.invoiceNumber || 'N/A'}
            </div>
          );
        },
    },
    {
      header: 'Customer',
      cell: ({ row }: any) => {
        if (row.original.customerName) {
          return (
            <div>
              <div className="font-medium">{row.original.customerName}</div>
              {row.original.customerPhone && (
                <div className="text-sm text-gray-500">
                  {row.original.customerPhone}
                </div>
              )}
            </div>
          );
        }
        const cust = customers.find(c => c.id === row.original.customerId);
        return cust ? (
          <div>
            <div className="font-medium">{cust.name}</div>
            <div className="text-sm text-gray-500">{cust.mobile}</div>
          </div>
        ) : (
          <span className="text-gray-500">No customer</span>
        );
      },
    },
    {
      header: 'Vehicle',
      cell: ({ row }: { row: { original: Invoice } }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        const regNumber = vehicle?.registrationNumber;
        const fullDetails = row.original.vehicleName || (vehicle ? `${vehicle.make} ${vehicle.model} (${regNumber})` : '');

        if (regNumber) {
          return <div className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono text-gray-800 w-fit" title={fullDetails}>{regNumber}</div>;
        }
        if (row.original.vehicleName) {
             return <div title={row.original.vehicleName}>{row.original.vehicleName}</div>
        }
        return <div className="text-gray-400">N/A</div>;
      },
    },
    { 
      header: 'Type',
      cell: ({ row }: any) => {
        if (row.original.isLoan) {
          return (
            <span className="px-2 py-1 text-xs font-medium text-purple-800 bg-purple-100 rounded-full">
              Loan
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
        if (inv.remainingAmount <= 0.001 && inv.paidAmount > 0) {
          return <StatusBadge status="paid" />;
        }
        const overdue = isOverdue(inv);
        const currentStatus = overdue ? 'overdue' : inv.paymentStatus;
        return <StatusBadge status={currentStatus} />;
      },
    },
    {
      header: 'Category',
      cell: ({ row }: any) => (
        <span className="capitalize font-medium text-sm text-gray-700">
          {row.original.category === 'Other'
            ? row.original.customCategory
            : row.original.category}
        </span>
      ),
    },
    {
      header: 'Cost Breakdown',
      cell: ({ row }: any) => {
        const inv = row.original;
        return (
          <div className="text-sm space-y-0.5">
            <div className="flex justify-between font-bold text-gray-900 border-b border-gray-100 pb-0.5">
              <span>Total:</span>
              <span>{formatCurrency(inv.total)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid:</span>
              <span>{formatCurrency(inv.paidAmount)}</span>
            </div>
            <div className={`flex justify-between font-medium ${inv.remainingAmount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              <span>Owing:</span>
              <span>{formatCurrency(inv.remainingAmount)}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Payment History',
      cell: ({ row }: any) => {
        const payments = row.original.payments || [];
        return payments.length > 0 ? (
          <div className="space-y-1">
            {payments.map((payment: any) => (
              <div
                key={payment.id}
                className="text-sm flex items-center justify-between bg-gray-50 p-1.5 rounded"
              >
                <div>
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
                    {can('invoices', 'delete') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePayment(row.original, payment.id);
                        }}
                        className="ml-2 text-red-600 hover:text-red-800"
                        title="Delete Payment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    <span className="capitalize">
                      {payment.method.replace('_', ' ')}
                    </span>
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
            
            {/* ROW 1: Editing & Core Actions */}
            <div className="flex flex-wrap justify-center gap-1">
              {can('invoices', 'view') && (
                <ActionBtn onClick={() => onView(inv)} icon={Eye} colorClass="text-blue-600" title="View Details" />
              )}
              {can('invoices', 'update') && (
                <ActionBtn onClick={() => onEdit(inv)} icon={Edit} colorClass="text-indigo-600" title="Edit Invoice" />
              )}
            </div>

            {/* ROW 2: Financials */}
            {inv.remainingAmount > 0 && can('invoices', 'recordPayment') && (
              <div className="flex flex-wrap justify-center gap-1 w-full pt-1 border-t border-gray-100">
                £<ActionBtn onClick={() => onRecordPayment(inv)} icon={CreditCard} colorClass="text-emerald-600" title="Record Payment" />
              </div>
            )}

            {/* ROW 3: Documents */}
            {can('invoices', 'singleDoc') && (
              <div className="flex flex-wrap justify-center gap-1 w-full pt-1.5 border-t border-gray-100">
                {inv.documentUrl ? (
                    <ActionBtn onClick={() => onViewDocument(inv)} icon={FileText} colorClass="text-green-700" title="View Document" />
                ) : (
                    <ActionBtn onClick={() => onGenerateDocument(inv)} icon={FileText} colorClass="text-gray-400 hover:text-green-700" title="Generate Document" />
                )}
              </div>
            )}

            {/* ROW 4: Destructive */}
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

  return (
    <DataTable
      data={sortedInvoices}
      columns={columns as any}
      onRowClick={(inv) => can('invoices', 'view') && onView(inv)}
      rowClassName={(inv) => (isOverdue(inv) ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500' : 'hover:bg-gray-50')}
    />
  );
};

export default InvoiceTable;