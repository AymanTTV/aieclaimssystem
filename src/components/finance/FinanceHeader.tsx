// src/components/finance/FinanceHeader.tsx
import React from 'react';
import { Download, Plus, Search, FileText, Settings, Repeat, Upload } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

interface FinanceHeaderProps {
  onSearch: (query: string) => void;
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
  onManageDepartments: () => void;
  onManageAccounts: () => void;
  onAddRecurring: () => void;
}

const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  onSearch, onImport, onExport, onAddIncome, onAddExpense, onGeneratePDF,
  onManageGroups, onManageDepartments, onManageCategories, onManageAccounts,
  onAddRecurring,
}) => {
  const { can } = usePermissions();

  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search by Customer, Vehicle Reg, Owner, Category, Payment Ref..."
          onChange={(e) => onSearch(e.target.value)}
          className="block w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl leading-5 bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
            {can('finance', 'accounts') && (
                <button onClick={onManageAccounts} className="inline-flex items-center justify-center px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors">
                    <Settings className="h-4 w-4 mr-2 text-[#64748B]" /> Accounts
                </button>
            )}
            {can('finance', 'groups') && (
                <button onClick={onManageGroups} className="inline-flex items-center justify-center px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors">
                    <Settings className="h-4 w-4 mr-2 text-[#64748B]" /> Groups
                </button>
            )}
            {can('finance', 'departments') && (
                <button onClick={onManageDepartments} className="inline-flex items-center justify-center px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors">
                    <Settings className="h-4 w-4 mr-2 text-teal-600" /> Depts
                </button>
            )}
            {can('finance', 'categories') && (
                <button onClick={onManageCategories} className="inline-flex items-center justify-center px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors">
                    <Settings className="h-4 w-4 mr-2 text-[#64748B]" /> Categories
                </button>
            )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            {can('finance', 'export') && <button onClick={onImport} className="inline-flex items-center justify-center px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors"><Upload className="h-4 w-4 mr-2 text-[#64748B]" /> Import</button>}
            {can('finance', 'export') && <button onClick={onExport} className="inline-flex items-center justify-center px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors"><Download className="h-4 w-4 mr-2 text-[#64748B]" /> Export</button>}
            {can('finance', 'export') && <button onClick={onGeneratePDF} className="inline-flex items-center justify-center px-3.5 py-2.5 border border-[#CBD5E1] rounded-xl shadow-xs text-sm font-semibold text-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-colors"><FileText className="h-4 w-4 mr-2 text-[#64748B]" /> PDF</button>}
            {can('finance', 'reoccurring') && <button onClick={onAddRecurring} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl shadow-xs text-sm font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors cursor-pointer"><Repeat className="h-4 w-4 mr-2" /> Recurring</button>}
            {can('finance', 'create') && <button onClick={onAddIncome} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl shadow-xs text-sm font-bold text-white bg-[#059669] hover:bg-[#047857] transition-colors cursor-pointer"><Plus className="h-4 w-4 mr-2" /> Income</button>}
            {can('finance', 'create') && <button onClick={onAddExpense} className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl shadow-xs text-sm font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-colors cursor-pointer"><Plus className="h-4 w-4 mr-2" /> Expense</button>}
        </div>
      </div>
    </div>
  );
};

export default FinanceHeader;