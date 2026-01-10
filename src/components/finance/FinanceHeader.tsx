// src/components/finance/FinanceHeader.tsx
import React from 'react';
import { Download, Plus, Search, FileText, Settings, Repeat, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

interface FinanceHeaderProps {
  onSearch: (query: string) => void;
  // Changed to () => void because the Header just triggers the click, 
  // the Parent component handles the actual file input change event.
  onImport: () => void; 
  onExport: () => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onGeneratePDF: () => void;
  period: 'week' | 'month' | 'year' | 'all';
  onPeriodChange: (period: 'week' | 'month' | 'year' | 'all') => void;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;

  onManageCategories: () => void;
  onManageGroups: () => void;
  onManageAccounts: () => void;
  
  onAddRecurring: () => void;
}

const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  onSearch,
  onImport, // <--- Destructured here
  onExport,
  onAddIncome,
  onAddExpense,
  onGeneratePDF,
  onManageGroups,
  onManageCategories,
  onManageAccounts,
  onAddRecurring,
}) => {
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
          placeholder="Search by Customer, Vehicle Reg, Owner, Category, Payment Ref..."
          onChange={(e) => onSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      {/* Actions row: wrap on mobile */}
      <div className="flex flex-wrap items-center gap-2 justify-between">

        {/* Management Buttons */}
        <div className="flex flex-wrap items-center gap-2">
            {user?.role === 'manager' && (
              <>
                <button
                    onClick={onManageAccounts}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                    <Settings className="h-5 w-5 mr-2" />
                    Manage Accounts
                </button>
                <button
                    onClick={onManageGroups}
                    className="inline-flex items-center justify-center px-4 py-2 border text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded"
                >
                    <Settings className="h-5 w-5 mr-2" />
                    Manage Groups
                </button>
                <button
                    onClick={onManageCategories}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                    <Settings className="h-5 w-5 mr-2" />
                    Manage Categories
                </button>
              </>
            )}
        </div>
        
        {/* Functional Buttons */}
        <div className="flex flex-wrap items-center gap-2">
            {/* Import Button */}
            {can('finance', 'create') && (
                <button
                    onClick={onImport}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                    <Upload className="h-5 w-5 mr-2" />
                    Import
                </button>
            )}

            {can('finance', 'export') && (
                <button
                    onClick={onExport}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                    <Download className="h-5 w-5 mr-2" />
                    Export
                </button>
            )}

            {user?.role === 'manager' && (
                <button
                    onClick={onGeneratePDF}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                    <FileText className="h-5 w-5 mr-2" />
                    PDF
                </button>
            )}

             {/* Recurring Button */}
             {can('finance', 'create') && (
                <button
                    onClick={onAddRecurring}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Repeat className="h-5 w-5 mr-2" />
                    Recurring
                </button>
            )}

            {can('finance', 'create') && (
                <button
                    onClick={onAddIncome}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-600"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Income
                </button>
            )}

            {can('finance', 'create') && (
                <button
                    onClick={onAddExpense}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Expense
                </button>
            )}
        </div>
        
      </div>
    </div>
  );
};

export default FinanceHeader;