import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Invoice, Vehicle } from '../../types';
import { Eye, FileText, DollarSign, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';
import { useCustomers } from '../hooks/useCustomers';
// Add this import at the top of these files:
import { Customer } from '../../types/customer';


interface InvoiceTableProps {
  invoices: Invoice[];
  vehicles: Vehicle[];
  customers: Customer[]; // Add this prop
  onView: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
  onMarkAsPaid: (invoice: Invoice) => void;
}


const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  vehicles,
  customers,
  onView,
  onEdit,
  onDelete,
  onDownload,
  onMarkAsPaid,
}) => {
  const columns = [
    {
  header: 'Customer',
  cell: ({ row }) => {
    if (row.original.customerName) {
      return <span>{row.original.customerName}</span>;
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
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy'),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.paymentStatus} />
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: ({ row }) => (
        <span className="capitalize">{row.original.category}</span>
      ),
    },
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        return vehicle ? (
          <div>
            <div className="font-medium">{vehicle.make} {vehicle.model}</div>
            <div className="text-sm text-gray-500">{vehicle.registrationNumber}</div>
          </div>
        ) : (
          <span className="text-gray-500">No vehicle related</span>
        );
      },
    },
    {
      header: 'Owner',
      cell: ({ row }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        return vehicle?.owner?.isDefault ? 'AIE Skyline' : vehicle?.owner?.name || 'AIE Skyline';
      },
    },
    {
      header: 'Amount',
      cell: ({ row }) => (
        <span className="font-medium">£{row.original.amount.toFixed(2)}</span>
      ),
    },
    {
      header: 'Description',
      accessorKey: 'description',
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
      className="text-blue-600 hover:text-blue-800"
      title="Edit"
    >
      <Edit className="h-4 w-4" />
    </button>
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
          {row.original.paymentStatus !== 'paid' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsPaid(row.original);
              }}
              className="text-primary hover:text-primary-600"
              title="Mark as Paid"
            >
              <DollarSign className="h-4 w-4" />
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
      onRowClick={(invoice) => onView(invoice)}
    />
  );
};

export default InvoiceTable;
