// src/components/vatRecord/VATRecordTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { VATRecord } from '../../types/vatRecord';
import { Eye, Edit, Trash2, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { format, isBefore, addDays, startOfDay } from 'date-fns';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface VATRecordTableProps {
  records: VATRecord[];
  onView: (record: VATRecord) => void;
  onEdit: (record: VATRecord) => void;
  onDelete: (record: VATRecord) => void;
  onGenerateDocument: (record: VATRecord) => void;
  onViewDocument: (url: string) => void;
  onUpdateStatus: (record: VATRecord) => void;
  selectedIds: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string) => void;
}

const VATRecordTable: React.FC<VATRecordTableProps> = ({
  records, onView, onEdit, onDelete, onGenerateDocument, onViewDocument, onUpdateStatus,
  selectedIds, onToggleAll, onToggleOne,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();
  const allSelected = records.length > 0 && selectedIds.size === records.length;
  const someSelected = records.length > 0 && selectedIds.size > 0 && !allSelected;

  // Helper function to determine Due Date color
  const getDueDateClass = (dueDate: Date) => {
    const now = startOfDay(new Date());
    const due = startOfDay(new Date(dueDate));

    // Red if strictly in the past (Overdue)
    if (isBefore(due, now)) {
      return 'text-red-600 font-medium';
    }
    // Yellow/Orange if due today or within the next 7 days
    if (isBefore(due, addDays(now, 8))) {
      return 'text-yellow-600 font-medium';
    }
    // Normal (Gray) otherwise
    return 'text-gray-500';
  };

  const columns = [
    {
      id: 'select',
      header: (
        <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary" checked={allSelected} ref={(input) => { if (input) input.indeterminate = someSelected; }} onChange={(e) => onToggleAll(e.target.checked)} />
      ),
      cell: ({ row }: { row: { original: VATRecord } }) => (
        <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary" checked={selectedIds.has(row.original.id)} onChange={() => onToggleOne(row.original.id)} onClick={(e) => e.stopPropagation()} />
      ),
    },
    {
      header: 'Receipt Details',
      cell: ({ row }) => {
        const isActive = row.original.isRecurring && !!row.original.nextRecurringDate;
        return (
            <div>
              <div className="font-medium flex items-center">
                  {row.original.receiptNo}
                  {row.original.isRecurring && (
                      <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] border ${isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                          <RefreshCw className="w-3 h-3 mr-1"/>
                          {row.original.recurringFrequency}
                      </span>
                  )}
              </div>
              <div className="text-sm text-gray-500">Date: {format(row.original.date, 'dd/MM/yyyy')}</div>
              
              {/* Added Due Date Display */}
              {row.original.dueDate && (
                <div className={`text-sm ${getDueDateClass(row.original.dueDate)}`}>
                  Due: {format(row.original.dueDate, 'dd/MM/yyyy')}
                </div>
              )}
            </div>
        )
      },
    },
    {
      header: 'Supplier Info',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.supplier}</div>
          <div className="text-sm text-gray-500">REG: {row.original.regNo}</div>
        </div>
      ),
    },
    {
      header: 'Financial Details',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div className="text-green-600">NET: {formatCurrency(row.original.net !== undefined ? row.original.net : 0)}</div>
          <div className="text-blue-600">VAT: {formatCurrency(row.original.vat !== undefined ? row.original.vat : 0)}</div>
          <div>GROSS: {formatCurrency(row.original.gross !== undefined ? row.original.gross : 0)}</div>
        </div>
      ),
    },
    {
      header: 'Customer',
      cell: ({ row }) => (<div className="font-medium">{row.original.customerName}</div>),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${row.original.status === 'awaiting' ? 'bg-yellow-100 text-yellow-800' : row.original.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('vatRecord', 'view') && <button onClick={(e) => { e.stopPropagation(); onView(row.original); }} className="text-blue-600 hover:text-blue-800" title="View Details"><Eye className="h-4 w-4" /></button>}
          {can('vatRecord', 'update') && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(row.original); }} className="text-blue-600 hover:text-blue-800" title="Edit"><Edit className="h-4 w-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); onGenerateDocument(row.original); }} className="text-green-600 hover:text-green-800" title="Generate Document"><FileText className="h-4 w-4" /></button>
            </>
          )}
          {can('vatRecord', 'update') && <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(row.original); }} className="text-blue-600 hover:text-blue-800" title="Update Status"><CheckCircle className="h-4 w-4" /></button>}
          {can('vatRecord', 'delete') && <button onClick={(e) => { e.stopPropagation(); onDelete(row.original); }} className="text-red-600 hover:text-red-800" title="Delete"><Trash2 className="h-4 w-4" /></button>}
        </div>
      ),
    },
  ];

  return <DataTable data={records} columns={columns} onRowClick={(record) => can('vatRecord', 'view') && onView(record)} />;
};

export default VATRecordTable;