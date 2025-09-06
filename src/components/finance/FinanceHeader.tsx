import React from 'react';
import { Download, Plus, Search, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

interface FinanceHeaderProps {
  onSearch: (query: string) => void;
  onImport: (file: File) => void;      // (kept for compatibility; not rendered here)
  onExport: () => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onGeneratePDF: () => void;
  period: 'week' | 'month' | 'year' | 'all';     // (kept for compatibility; no UI change requested)
  onPeriodChange: (period: 'week' | 'month' | 'year' | 'all') => void;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;

  onManageCategories: () => void;
  onManageGroups: () => void;
}

const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  onSearch,
  onExport,
  onAddIncome,
  onAddExpense,
  onGeneratePDF,
  onManageGroups,
  onManageCategories,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { can } = usePermissions();
  const { user } = useAuth();

  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by Vehicle Reg, Owner, Category, Payment Ref..."
          onChange={(e) => onSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      {/* Actions row: wrap on mobile */}
      <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
        {can('finance', 'export') && (
          <button
            onClick={onExport}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-[48%] sm:w-auto"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
        )}

        {user?.role === 'manager' && (
          <button
            onClick={onGeneratePDF}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-[48%] sm:w-auto"
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate PDF
          </button>
        )}

        {can('finance', 'create') && (
          <button
            onClick={onAddIncome}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-600 w-[48%] sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Income
          </button>
        )}

        {can('finance', 'create') && (
          <button
            onClick={onAddExpense}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 w-[48%] sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Expense
          </button>
        )}

        {user?.role === 'manager' && (
          <button
            onClick={onManageGroups}
            className="inline-flex items-center justify-center px-4 py-2 border text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded w-[48%] sm:w-auto"
          >
            <FileText className="h-5 w-5 mr-2" />
            Manage Groups
          </button>
        )}

        {user?.role === 'manager' && (
          <button
            onClick={onManageCategories}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
          >
            <FileText className="h-5 w-5 mr-2" />
            Manage Categories
          </button>
        )}
      </div>
    </div>
  );
};

export default FinanceHeader;
