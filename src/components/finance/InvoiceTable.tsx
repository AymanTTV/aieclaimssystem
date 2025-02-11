import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Invoice, Vehicle, Customer } from '../../types';
import { Eye, FileText, DollarSign, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions';


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
}) => {
  const formatDate = (date: any): string => {
    // Handle Firestore Timestamp
    if (date?.toDate) {
      return format(date.toDate(), 'dd/MM/yyyy HH:mm');
    }
    
    // Handle regular Date objects
    if (date instanceof Date) {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
    
    return 'N/A';
  };
  const { can } = usePermissions();

  // Add function to check if invoice is overdue
  const isOverdue = (invoice: Invoice): boolean => {
    return invoice.paymentStatus !== 'paid' && new Date() > invoice.dueDate;
  };

  // Sort invoices: overdue first, then by due date ascending
  const sortedInvoices = [...invoices].sort((a, b) => {
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    
    // If one is overdue and the other isn't, overdue comes first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    
    // If both are overdue or both are not overdue, sort by due date
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
            <div className="text-sm text-gray-500">{row.original.customerPhone}</div>
          )}
        </div>
      );
    }
    const customer = customers?.find(c => c.id === row.original.customerId);
    return customer ? (
      <div>
        <div className="font-medium">{customer.name}</div>
        <div className="text-sm text-gray-500">{customer.mobile}</div>
      </div>
    ) : (
      <span className="text-gray-500">No customer</span>
    );
  },
},
    // {
    //   header: 'Date',
    //   cell: ({ row }) => formatDate(row.original.date),
    // },
    {
      header: 'Due Date',
      cell: ({ row }) => formatDate(row.original.dueDate),
    },
    {
      header: 'Status',
      cell: ({ row }) => {
        const invoice = row.original;
        // Check if invoice is overdue
        const overdue = isOverdue(invoice);
        return (
          <div className="space-y-1">
            <StatusBadge 
              status={overdue ? 'overdue' : invoice.paymentStatus} 
              className={overdue ? 'bg-red-100 text-red-800' : ''}
            />
          </div>
        );
      },
    },
    {
      header: 'Category',
      cell: ({ row }) => (
        <span className="capitalize">
          {row.original.category === 'other' ? row.original.customCategory : row.original.category}
        </span>
      ),
    },
    // {
    //   header: 'Description',
    //   accessorKey: 'description',
    // },
    {
      header: 'Amount',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">£{row.original.amount.toFixed(2)}</div>
          {row.original.paidAmount > 0 && (
            <div className="text-xs">
              <span className="text-green-600">Paid: £{row.original.paidAmount.toFixed(2)}</span>
              {row.original.remainingAmount > 0 && (
                <span className="text-amber-600 ml-1">
                  Due: £{row.original.remainingAmount.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Payment History',
      cell: ({ row }) => {
        const payments = row.original.payments || [];
        return payments.length > 0 ? (
          <div className="space-y-1">
            {payments.map((payment) => (
              <div key={payment.id} className="text-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <span>£{payment.amount.toFixed(2)}</span>
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
                    <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                    <span className="mx-1">•</span>
                    <span>{formatDate(payment.date)}</span>
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
          <DollarSign className="h-4 w-4" />
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
  {row.original.documentUrl && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDownload(row.original);
      }}
      className="text-green-600 hover:text-green-800"
      title="Download Invoice"
    >
      <FileText className="h-4 w-4" />
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
      onRowClick={(invoice) => onView(invoice)}
      rowClassName={(invoice) => isOverdue(invoice) ? 'bg-red-50' : ''}
    />
  );
};

export default InvoiceTable;