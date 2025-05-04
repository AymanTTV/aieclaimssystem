import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { VDInvoice } from '../../types/vdInvoice';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import StatusBadge from '../ui/StatusBadge';

interface VDInvoiceTableProps {
  invoices: VDInvoice[];
  onView: (invoice: VDInvoice) => void;
  onEdit: (invoice: VDInvoice) => void;
  onDelete: (invoice: VDInvoice) => void;
  onGenerateDocument: (invoice: VDInvoice) => void;
  onViewDocument: (url: string) => void;
}

const VDInvoiceTable: React.FC<VDInvoiceTableProps> = ({
  invoices,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument
}) => {
  const columns = [
    {
      header: 'Invoice Number',
      accessorKey: 'invoiceNumber',
    },
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy'),
    },
    {
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customerName}</div>
          <div className="text-sm text-gray-500">{row.original.customerPhone}</div>
        </div>
      ),
    },
    {
      header: 'Vehicle',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.registration} - {row.original.make} {row.original.model}
          </div>
        </div>
      ),
    },
    {
      header: 'Payment Details',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">Total: £{row.original.total.toFixed(2)}</div>
          <div className="text-sm text-green-600">
            Paid: £{row.original.paidAmount.toFixed(2)}
          </div>
          {row.original.remainingAmount > 0 && (
            <div className="text-sm text-amber-600">
              Due: £{row.original.remainingAmount.toFixed(2)}
            </div>
          )}
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row.original);
            }}
            className="text-yellow-600 hover:text-yellow-800"
            title="Edit Invoice"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateDocument(row.original);
            }}
            className="text-green-600 hover:text-green-800"
            title="Generate Document"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.original);
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete Invoice"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {row.original.documentUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDocument(row.original.documentUrl!);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Document"
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
      data={invoices}
      columns={columns}
      onRowClick={onView}
    />
  );
};

export default VDInvoiceTable;