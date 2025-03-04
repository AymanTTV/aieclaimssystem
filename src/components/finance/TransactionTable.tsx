import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Transaction, Vehicle, Customer } from '../../types';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface TransactionTableProps {
  transactions: Transaction[];
  vehicles: Vehicle[];
  customers: Customer[];
  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onGenerateDocument: (transaction: Transaction) => void;
  onViewDocument: (url: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  vehicles = [],
  customers = [],
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument
}) => {
  const { can } = usePermissions();

  // Sort transactions by date in descending order
  const sortedTransactions = [...transactions].sort((a, b) => 
    b.date.getTime() - a.date.getTime()
  );

  const columns = [
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy'),
      sortable: true,
      sortDescFirst: true
    },
    {
      header: 'Type & Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.type} />
          <StatusBadge status={row.original.status || 'completed'} />
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: ({ row }) => {
        if (row.original.customerName) {
          return <div className="font-medium">{row.original.customerName}</div>;
        }
        const customer = customers.find(c => c.id === row.original.customerId);
        return customer ? (
          <div>
            <div className="font-medium">{customer.name}</div>
            <div className="text-sm text-gray-500">{customer.mobile}</div>
          </div>
        ) : null;
      },
    },
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        if (!row.original.vehicleId) return null;
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        if (!vehicle) return null;

        return (
          <div>
            <div className="font-medium">
              {vehicle.make} {vehicle.model}
            </div>
            <div className="text-sm text-gray-500">
              {vehicle.registrationNumber}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Category',
      accessorKey: 'category',
    },
    {
      header: 'Amount',
      cell: ({ row }) => (
        <span className={row.original.type === 'income' ? 'text-green-600' : 'text-red-600'}>
          £{row.original.amount.toFixed(2)}
        </span>
      ),
      sortable: true
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('finance', 'view') && (
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
          {can('finance', 'update') && (
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
            </>
          )}
          {can('finance', 'delete') && (
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
                onViewDocument(row.original.documentUrl!);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Document"
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
      data={sortedTransactions}
      columns={columns}
      onRowClick={(transaction) => can('finance', 'view') && onView(transaction)}
      defaultSortColumn="date"
      defaultSortDirection="desc"
    />
  );
};

export default TransactionTable;