// src/components/IncomeExpense/IncomeExpenseTable.tsx
import React from 'react';
import { IncomeExpenseEntry } from '../../types/incomeExpense';
import { Eye, Edit, Trash2, FileText } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { DataTable } from '../DataTable/DataTable';
import { format } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface Props {
  entries: IncomeExpenseEntry[];
  onView: (entry: IncomeExpenseEntry) => void;
  onEdit: (entry: IncomeExpenseEntry) => void;
  onDelete: (entry: IncomeExpenseEntry) => void;
  onGenerateDocument: (entry: IncomeExpenseEntry) => void;
}

const IncomeExpenseTable: React.FC<Props> = ({
  entries,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const columns = [
    {
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.customer || row.original.customerName || '—'}
          </div>
          <div className="text-sm text-gray-500">
            Ref: {row.original.reference}
          </div>
        </div>
      )
    },
    {
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'dd/MM/yyyy')
    },
    {
      header: 'Type',
      accessorKey: 'type'
    },
    {
      header: 'Total',
      cell: ({ row }) => {
        const isIncome = row.original.type === 'income';
        const total = isIncome
          ? row.original.total
          : (row.original as any).totalCost;
        return typeof total === 'number' ? formatCurrency(total) : '—';
      }
    },
    {
      header: 'Status',
      accessorKey: 'status'
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
            title="View"
            className="text-blue-600 hover:text-blue-800"
          >
            <Eye className="h-4 w-4" />
          </button>
          {can('finance', 'update') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row.original);
              }}
              title="Edit"
              className="text-blue-600 hover:text-blue-800"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {can('finance', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original); // Triggers custom modal
              }}
              title="Delete"
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGenerateDocument(row.original);
            }}
            title="PDF"
            className="text-green-600 hover:text-green-800"
          >
            <FileText className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <DataTable
      data={entries}
      columns={columns}
      onRowClick={(e) => can('finance', 'view') && onView(e)}
    />
  );
};

export default IncomeExpenseTable;
