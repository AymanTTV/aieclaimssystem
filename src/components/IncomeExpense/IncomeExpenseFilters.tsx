// src/components/IncomeExpense/IncomeExpenseFilters.tsx
import React, { useEffect, useState } from 'react';
import { Search, History } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Props {
  search: string;
  onSearch: (val: string) => void;
  typeFilter: 'all' | 'income' | 'expense';
  onType: (val: 'all' | 'income' | 'expense') => void;
  progress: 'all' | 'in-progress' | 'completed';
  onProgress: (val: 'all' | 'in-progress' | 'completed') => void;
  dateRange: { start: string; end: string };
  onDateRange: (range: { start: string; end: string }) => void;
  permissionScope?: string;
  showHistory: boolean;
  onToggleHistory: (val: boolean) => void;
  category: string;
  onCategory: (val: string) => void;
  categoriesCollection?: string;
  
  recurringFilter?: 'all' | 'recurring' | 'non_recurring';
  onRecurringFilterChange?: (val: 'all' | 'recurring' | 'non_recurring') => void;
  
  // --- NEW PROPS ---
  recurringFrequency?: string;
  onRecurringFrequencyChange?: (val: string) => void;
}

const IncomeExpenseFilters: React.FC<Props> = ({
  search, onSearch,
  typeFilter, onType,
  progress, onProgress,
  dateRange, onDateRange,
  showHistory, onToggleHistory,
  category, onCategory,
  categoriesCollection = 'incomeExpenseCategories',
  recurringFilter, onRecurringFilterChange,
  recurringFrequency, onRecurringFrequencyChange // Destructure
}) => {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if(!categoriesCollection) return;
    getDocs(collection(db, categoriesCollection)).then(snap => {
      setCategories(snap.docs.map(d => d.data().name).sort())
    }).catch(console.error);
  }, [categoriesCollection]);

  return (
    <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs text-[#0F172A] space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-center">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Search</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by name or reference..."
              className="block w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs transition-all"
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => onType(e.target.value as any)}
            className="block w-full py-2.5 px-3 border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Category</label>
          <select
            value={category}
            onChange={(e) => onCategory(e.target.value)}
            className="block w-full py-2.5 px-3 border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between pt-3 border-t border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Date Range */}
          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">From</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => onDateRange({ ...dateRange, start: e.target.value })}
                className="block w-full rounded-xl border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">To</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => onDateRange({ ...dateRange, end: e.target.value })}
                className="block w-full rounded-xl border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              />
            </div>
          </div>
          
          {/* Recurring Status */}
          {recurringFilter && onRecurringFilterChange && (
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Recurring</label>
              <select
                value={recurringFilter}
                onChange={(e) => onRecurringFilterChange(e.target.value as any)}
                className="block w-full py-2 px-3 border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
              >
                <option value="all">All</option>
                <option value="recurring">Yes</option>
                <option value="non_recurring">No</option>
              </select>
            </div>
          )}

          {/* --- NEW: Frequency Filter (Only show if recurring or all is selected) --- */}
          {recurringFrequency && onRecurringFrequencyChange && recurringFilter !== 'non_recurring' && (
            <div>
              <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Period</label>
              <select
                value={recurringFrequency}
                onChange={(e) => onRecurringFrequencyChange(e.target.value)}
                className="block w-full py-2 px-3 border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
              >
                <option value="all">All Periods</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="biannually">Biannually</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}
        </div>
        
        {/* History */}
        <div className="flex items-center pb-1">
          <button
            type="button"
            onClick={() => onToggleHistory(!showHistory)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${showHistory ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${showHistory ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className="ml-3 text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#64748B]" /> Include Past
          </span>
        </div>
      </div>
    </div>
  );
};

export default IncomeExpenseFilters;