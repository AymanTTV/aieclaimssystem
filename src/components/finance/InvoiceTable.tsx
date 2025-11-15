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
  const formatDateValue = (date: any): string => {
    if (date?.toDate) return format(date.toDate(), 'dd/MM/yyyy');
    if (date instanceof Date) return format(date, 'dd/MM/yyyy');
    return 'N/A';
  };

  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const isOverdue = (invoice: Invoice): boolean => {
    const status = invoice.paymentStatus;
    return (status === 'pending' || status === 'partially_paid' || status === 'unpaid') && new Date() > new Date(invoice.dueDate);
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    const aOver = isOverdue(a);
    const bOver = isOverdue(b);
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    const dateA = a.date instanceof Date ? a.date : a.date.toDate();
    const dateB = b.date instanceof Date ? b.date : b.date.toDate();
    return dateB.getTime() - dateA.getTime();
  });

  const columns = [
    {
        header: 'Invoice #',
        cell: ({ row }) => {
          return (
            <div className="font-medium text-gray-800">
              {row.original.invoiceNumber || 'N/A'}
            </div>
          );
        },
    },
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
    // --- ⬇️ NEW VEHICLE COLUMN ⬇️ ---
    {
      header: 'Vehicle',
      cell: ({ row }: { row: { original: Invoice } }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        const regNumber = vehicle?.registrationNumber;
        const fullDetails = row.original.vehicleName || (vehicle ? `${vehicle.make} ${vehicle.model} (${regNumber})` : '');

        if (regNumber) {
          // Display only Reg Number, use full details in title for hover
          return <div title={fullDetails}>{regNumber}</div>;
        }
        if(row.original.vehicleName) {
             // Display cached name if no vehicle found but name exists
             return <div title={row.original.vehicleName}>{row.original.vehicleName}</div>
        }
        return <div className="text-gray-400">N/A</div>; // Fallback
      },
    },
    // --- ⬆️ END NEW VEHICLE COLUMN ⬆️ ---
    { 
      header: 'Type',
      cell: ({ row }) => {
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
      cell: ({ row }) => formatDateValue(row.original.dueDate),
    },
    {
      header: 'Status',
      cell: ({ row }) => {
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
      cell: ({ row }) => (
        <span className="capitalize">
          {row.original.category === 'Other'
            ? row.original.customCategory
            : row.original.category}
        </span>
      ),
    },
   {
      header: 'Cost Breakdown',
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div className="text-sm space-y-1">
            <div>Total: {formatCurrency(inv.total)}</div>
            <div className="text-green-600">Paid: {formatCurrency(inv.paidAmount)}</div>
            <div className="font-medium">Owing: {formatCurrency(inv.remainingAmount)}</div>
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
                    {can('finance', 'delete') && (
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
          <span className="text-gray-500 text-sm">No payments</span>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 items-center">
          {can('finance', 'view') && (
            <button
              onClick={(e) => { e.stopPropagation(); onView(row.original); }}
              className="text-gray-500 hover:text-blue-600" title="View Details"
            > <Eye className="h-4 w-4" /> </button>
          )}

          {can('finance', 'update') && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(row.original); }}
              className="text-gray-500 hover:text-blue-600" title="Edit"
            > <Edit className="h-4 w-4" /> </button>
          )}

          {can('finance', 'update') && (
            <button
              onClick={(e) => { e.stopPropagation(); onGenerateDocument(row.original); }}
              className="text-green-600 hover:text-green-800" title="Generate PDF"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          
          {row.original.documentUrl && can('finance', 'view') && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewDocument(row.original); }}
              className="text-gray-500 hover:text-blue-600" title="View PDF"
            > <Eye className="h-4 w-4" /> </button>
          )}

          {can('finance', 'delete') && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(row.original); }}
              className="text-gray-500 hover:text-red-600" title="Delete"
            > <Trash2 className="h-4 w-4" /> </button>
          )}

          {row.original.remainingAmount > 0 && can('finance', 'create') && (
            <button
              onClick={(e) => { e.stopPropagation(); onRecordPayment(row.original); }}
              className="text-primary hover:text-primary-dark font-bold" title="Record Payment"
            > £ </button>
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
      rowClassName={(inv) => (isOverdue(inv) ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50')}
    />
  );
};

export default InvoiceTable;