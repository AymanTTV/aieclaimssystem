import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Transaction, Vehicle } from '../../types';
import { Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions';



interface TransactionTableProps {
  transactions: Transaction[];
  vehicles: Vehicle[];
  onView: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  vehicles,
  onView,
  onEdit,
  onDelete,
}) => {

  const { can } = usePermissions();

  
  const columns = [
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy'),
    },
     {
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.type} />
          <StatusBadge status={row.original.status} />
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category',
    },
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        if (!row.original.vehicleId) return 'N/A';
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        return vehicle ? (
          <div>
            <div className="font-medium">
              {vehicle.make} {vehicle.model}
            </div>
            <div className="text-sm text-gray-500">
              {vehicle.registrationNumber}
            </div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Owner',
      cell: ({ row }) => {
        if (!row.original.vehicleId) return 'N/A';
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        return vehicle?.owner?.isDefault ? 'AIE Skyline' : vehicle?.owner?.name || 'N/A';
      },
    },

    {
      header: 'Amount',
      cell: ({ row }) => (
        <span className={row.original.type === 'income' ? 'text-green-600' : 'text-red-600'}>
          £{row.original.amount.toFixed(2)}
        </span>
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
</div>


      ),
    },
  ];

  return (
    <DataTable
      data={transactions}
      columns={columns}
      onRowClick={(transaction) => onView(transaction)}
    />
  
  );
};

export default TransactionTable;