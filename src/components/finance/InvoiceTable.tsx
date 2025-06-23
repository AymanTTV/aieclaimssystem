// src/components/finance/InvoiceTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Invoice, Vehicle, Customer } from '../../types/finance';
import { Eye, FileText, Edit, Trash2 } from 'lucide-react';
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
  onApplyDiscount: (invoice: Invoice) => void;   // not used here
  onDeletePayment: (invoice: Invoice, paymentId: string) => void;

  // NEW: callbacks for single‐invoice PDF generation / viewing
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

  // NEW:
  onGenerateDocument,
  onViewDocument,
}) => {
  const formatDateValue = (date: any): string => {
    if (date?.toDate) return format(date.toDate(), 'dd/MM/yyyy HH:mm');
    if (date instanceof Date) return format(date, 'dd/MM/yyyy HH:mm');
    return 'N/A';
  };

  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  // Mark overdue if not paid and past dueDate
  const isOverdue = (invoice: Invoice): boolean => {
    return invoice.paymentStatus !== 'paid' && new Date() > invoice.dueDate;
  };

  // Always show overdue first, then by ascending due date
  const sortedInvoices = [...invoices].sort((a, b) => {
    const aOver = isOverdue(a);
    const bOver = isOverdue(b);
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const columns = [
    {
      header: 'Customer',
      cell: ({ row }) => {
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
      header: 'Due Date',
      cell: ({ row }) => formatDateValue(row.original.dueDate),
    },
    {
      header: 'Status',
      cell: ({ row }) => {
        const inv = row.original;
        const overdue = isOverdue(inv);
        return (
          <StatusBadge
            status={overdue ? 'overdue' : inv.paymentStatus}
            className={overdue ? 'bg-red-100 text-red-800' : ''}
          />
        );
      },
    },
    {
      header: 'Category',
      cell: ({ row }) => (
        <span className="capitalize">
          {row.original.category === 'other'
            ? row.original.customCategory
            : row.original.category}
        </span>
      ),
    },
   {
      header: 'Cost Breakdown',
      cell: ({ row }) => {
        const inv = row.original;
        // compute total discount from lineItems
        const totalDiscount = inv.lineItems.reduce((sum, li) => {
          const gross = li.quantity * li.unitPrice;
          return sum + (li.discount / 100) * gross;
        }, 0);
        const net = inv.subTotal;
        const vat = inv.vatAmount;
        const total = net + vat - totalDiscount;
        const paid = inv.paidAmount;
        const owing = inv.remainingAmount;

        return (
          <div className="text-sm space-y-1">
            <div>Net: {formatCurrency(net)}</div>
            <div>VAT: {formatCurrency(vat)}</div>
            {/* <div className="text-red-600">Discount: –{formatCurrency(totalDiscount)}</div> */}
            <div>Total: {formatCurrency(total)}</div>
            <div>Paid: {formatCurrency(paid)}</div>
            <div>Owing: {formatCurrency(owing)}</div>
          </div>
        );
      },
    },
    {
      header: 'Payment History',
      cell: ({ row }) => {
        const payments = row.original.payments || [];
        return payments.length > 0 ? (
          <div className="space-y-1">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="text-sm flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center">
                    <span>{formatCurrency(payment.amount)}</span>
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
                  </div>
                  <div className="text-xs text-gray-500">
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
          <span className="text-gray-500">No payments</span>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('invoices', 'view') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}

          {can('invoices', 'update') && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                className="text-blue-600 hover:text-blue-800"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              {row.original.remainingAmount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordPayment(row.original);
                  }}
                  className="text-primary hover:text-primary-600"
                  title="Record Payment"
                >
                  <span className="text-lg">£</span>
                </button>
              )}
            </>
          )}

          {can('invoices', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}

          {/* ── NEW: Generate PDF for this invoice ── */}
          {can('invoices', 'update') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateDocument(row.original);
              }}
              className="text-green-600 hover:text-green-800"
              title="Generate PDF"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}

          {/* ── NEW: View already‐generated invoice PDF ── */}
          {row.original.documentUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDocument(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View PDF"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={sortedInvoices}
      columns={columns}
      onRowClick={(inv) => onView(inv)}
      rowClassName={(inv) => (isOverdue(inv) ? 'bg-red-50' : '')}
    />
  );
};

export default InvoiceTable;
