import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { PettyCashTransaction } from '../../types/pettyCash';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';

interface PettyCashTableProps {
  transactions: PettyCashTransaction[];
  onView: (transaction: PettyCashTransaction) => void;
  onEdit: (transaction: PettyCashTransaction) => void;
  onDelete: (transaction: PettyCashTransaction) => void;
}

const PettyCashTable: React.FC<PettyCashTableProps> = ({
  transactions,
  onView,
  onEdit,
  onDelete,
}) => {
  const { can } = usePermissions();

  // Calculate running balance for each transaction
  const transactionsWithBalance = transactions.map((transaction, index) => {
    const previousBalance = index > 0 ? transactions[index - 1].balance : 0;
    const currentChange = (transaction.amountIn || 0) - (transaction.amountOut || 0);
    const balance = previousBalance + currentChange;
    return { ...transaction, balance };
  });

  const getStatusColor = (status: PettyCashTransaction['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50';
      case 'paid':
        return 'bg-green-50';
      case 'unpaid':
        return 'bg-red-50';
      default:
        return '';
    }
  };

  const columns = [
    {
      header: 'Date & Time',
      cell: ({ row }) => format(row.original.date, 'dd/MM/yyyy HH:mm'),
    },
    {
      header: 'Name',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-gray-500">{row.original.telephone}</div>
        </div>
      ),
    },
    {
      header: 'Description',
      cell: ({ row }) => (
        <div>
          <div className="text-sm">{row.original.description}</div>
          {row.original.note && (
            <div className="text-xs text-gray-500">{row.original.note}</div>
          )}
        </div>
      ),
    },
    {
      header: 'In',
      cell: ({ row }) => row.original.amountIn > 0 ? (
        <span className="text-green-600">£{row.original.amountIn.toFixed(2)}</span>
      ) : null,
    },
    {
      header: 'Out',
      cell: ({ row }) => row.original.amountOut > 0 ? (
        <span className="text-red-600">£{row.original.amountOut.toFixed(2)}</span>
      ) : null,
    },
    {
      header: 'Balance',
      cell: ({ row }) => (
        <span className={`font-medium ${row.original.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          £{row.original.balance.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
          ${row.original.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            row.original.status === 'paid' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'}`}
        >
          {row.original.status}
        </span>
      ),
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
      data={transactionsWithBalance}
      columns={columns}
      onRowClick={(transaction) => can('finance', 'view') && onView(transaction)}
      rowClassName={(transaction) => getStatusColor(transaction.status)}
    />
  );
};

export default PettyCashTable;