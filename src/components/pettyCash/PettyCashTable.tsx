import React from 'react';
import { PettyCashTransaction } from '../../types/pettyCash';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { DataTable } from '../DataTable/DataTable';

interface PettyCashTableProps {
  transactions: PettyCashTransaction[];
  onView: (transaction: PettyCashTransaction) => void;
  onEdit: (transaction: PettyCashTransaction) => void;
  onDelete: (transaction: PettyCashTransaction) => void;
  onGenerateDocument: (transaction: PettyCashTransaction) => void;
  onViewDocument: (url: string) => void;
  collectionName?: string;
}

const PettyCashTable: React.FC<PettyCashTableProps> = ({
  transactions,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  let runningBalance = 0;
  const transactionsWithBalance = transactions.map((t) => {
    runningBalance += (t.amountIn || 0) - (t.amountOut || 0);
    return { ...t, calculatedBalance: runningBalance };
  });

  const columns = [
    {
      header: 'Date & Time',
      cell: ({ row }) => format(new Date(row.original.date), 'dd/MM/yyyy HH:mm'),
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
          {row.original.note && <div className="text-xs text-gray-500">{row.original.note}</div>}
        </div>
      ),
    },
    {
      header: 'In',
      cell: ({ row }) => {
        const amountIn = Number(row.original.amountIn) || 0;
        return amountIn > 0 ? <span className="text-green-600">{formatCurrency(amountIn)}</span> : null;
      },
    },
    {
      header: 'Out',
      cell: ({ row }) => {
        const amountOut = Number(row.original.amountOut) || 0;
        return amountOut > 0 ? <span className="text-red-600">{formatCurrency(amountOut)}</span> : null;
      },
    },
    {
      header: 'Balance',
      cell: ({ row }) => {
        const balance = row.original.calculatedBalance || 0;
        return (
          <span className={balance >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(Math.abs(balance))}
          </span>
        );
      },
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
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
          {can('pettyCash', 'view') && (
            <button onClick={(e) => { e.stopPropagation(); onView(row.original); }} title="View">
              <Eye className="h-4 w-4 text-blue-600 hover:text-blue-800" />
            </button>
          )}
          {can('pettyCash', 'update') && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(row.original); }} title="Edit">
                <Edit className="h-4 w-4 text-blue-600 hover:text-blue-800" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onGenerateDocument(row.original); }} title="Generate Document">
                <FileText className="h-4 w-4 text-green-600 hover:text-green-800" />
              </button>
            </>
          )}
          {can('pettyCash', 'delete') && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(row.original); }} title="Delete">
              <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800" />
            </button>
          )}
          {row.original.documentUrl && (
            <button onClick={(e) => { e.stopPropagation(); onViewDocument(row.original.documentUrl); }} title="View Document">
              <Eye className="h-4 w-4 text-blue-600 hover:text-blue-800" />
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
      onRowClick={(transaction) => can('pettyCash', 'view') && onView(transaction)}
    />
  );
};

export default PettyCashTable;
