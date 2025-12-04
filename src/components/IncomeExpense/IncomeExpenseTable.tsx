// src/components/IncomeExpense/IncomeExpenseTable.tsx
import React from 'react';
import { IncomeExpenseEntry, ProfitShare } from '../../types/incomeExpense';
import { Eye, Edit, Trash2, FileText, MessageSquare, RefreshCw } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { DataTable } from '../DataTable/DataTable';
import { format } from 'date-fns';
import { RolePermissions } from '../../types/roles';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface Props {
  entries: IncomeExpenseEntry[];
  shares?: ProfitShare[];
  onView: (entry: IncomeExpenseEntry) => void;
  onEdit: (entry: IncomeExpenseEntry) => void;
  onDelete: (entry: IncomeExpenseEntry) => void;
  onGenerateDocument: (entry: IncomeExpenseEntry) => void;
  permissionScope?: keyof RolePermissions;
}

const IncomeExpenseTable: React.FC<Props> = ({
  entries,
  shares = [],
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  permissionScope = 'incomeExpense'
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const isSplitted = (date: string) => {
    const d = date.slice(0, 10);
    return shares.some(sp => sp.startDate && sp.endDate && d >= sp.startDate && d <= sp.endDate);
  }

  const columns = [
    {
      header: 'Customer / Ref',
      cell: ({ row }: { row: { original: IncomeExpenseEntry } }) => {
        const covered = isSplitted(row.original.date);
        const isLatestRecurring = row.original.isRecurring && !!row.original.nextRecurringDate;

        return (
          <div className="relative">
            <div className="font-medium text-gray-900 flex items-center gap-2">
              {row.original.customer || '—'}
              {covered && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800 border border-purple-200" title="Splitted">
                  Splitted
                </span>
              )}
              {row.original.isRecurring && (
                 <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${isLatestRecurring ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                   <RefreshCw className="w-3 h-3 mr-1"/>
                   {row.original.recurringFrequency}
                   {isLatestRecurring && <span className="ml-1 font-bold">(Latest)</span>}
                 </span>
              )}
            </div>
            <div className="text-xs text-gray-500">Ref: {row.original.reference}</div>
          </div>
        )
      }
    },
    { header: 'Date', cell: ({ row }) => <span className="text-sm text-gray-600">{format(new Date(row.original.date), 'dd/MM/yyyy')}</span> },
    { header: 'Category', accessorKey: 'category', cell: ({ row }) => <span className="text-sm text-gray-700">{row.original.category || '-'}</span> },
    {
      header: 'Type', accessorKey: 'type',
      cell: ({ row }) => <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${row.original.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{row.original.type}</span>
    },
    {
      header: 'Total',
      cell: ({ row }) => {
        const isIncome = row.original.type === 'income';
        const total = isIncome ? row.original.total : (row.original as any).totalCost;
        return <span className={`font-semibold ${isIncome ? 'text-green-700' : 'text-red-700'}`}>{typeof total === 'number' ? formatCurrency(total) : '—'}</span>;
      }
    },
    {
      header: 'Status', accessorKey: 'status',
      cell: ({ row }) => <span className={`text-xs px-2 py-1 rounded-full ${row.original.status === 'Paid' ? 'bg-green-50 text-green-700' : row.original.status === 'Unpaid' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>{row.original.status}</span>
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2 items-center">
          {row.original.note && <div title="Has Notes" className="text-yellow-500 cursor-help"><MessageSquare className="h-3 w-3" /></div>}
          <button onClick={(e) => { e.stopPropagation(); onView(row.original); }} title="View" className="text-gray-400 hover:text-blue-600 transition-colors"><Eye className="h-4 w-4" /></button>
          {can(permissionScope, 'update') && <button onClick={(e) => { e.stopPropagation(); onEdit(row.original); }} title="Edit" className="text-gray-400 hover:text-orange-600 transition-colors"><Edit className="h-4 w-4" /></button>}
          <button onClick={(e) => { e.stopPropagation(); onGenerateDocument(row.original); }} title="PDF" className="text-gray-400 hover:text-green-600 transition-colors"><FileText className="h-4 w-4" /></button>
          {can(permissionScope, 'delete') && <button onClick={(e) => { e.stopPropagation(); onDelete(row.original); }} title="Delete" className="text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="h-4 w-4" /></button>}
        </div>
      )
    }
  ];

  return <DataTable data={entries} columns={columns} onRowClick={(e) => can(permissionScope, 'view') && onView(e)} />;
};

export default IncomeExpenseTable;