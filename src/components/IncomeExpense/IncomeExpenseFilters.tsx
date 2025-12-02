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
  // New Category Props
  category: string;
  onCategory: (val: string) => void;
  categoriesCollection?: string; // e.g. 'incomeExpenseCategories'
}

const IncomeExpenseFilters: React.FC<Props> = ({
  search,
  onSearch,
  typeFilter,
  onType,
  progress,
  onProgress,
  dateRange,
  onDateRange,
  showHistory,
  onToggleHistory,
  category,
  onCategory,
  categoriesCollection = 'incomeExpenseCategories'
}) => {
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch categories
  useEffect(() => {
    if(!categoriesCollection) return;
    getDocs(collection(db, categoriesCollection)).then(snap => {
      setCategories(snap.docs.map(d => d.data().name).sort())
    }).catch(console.error);
  }, [categoriesCollection]);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-center">
        
        {/* Search */}
        <div className="relative sm:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by name or reference..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => onType(e.target.value as any)}
          className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => onCategory(e.target.value)}
          className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

      </div>

      {/* Second Row: Date Range + History + Status */}
      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between pt-2 border-t border-gray-100">
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
           {/* Date Range */}
            <div className="flex gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => onDateRange({ ...dateRange, start: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => onDateRange({ ...dateRange, end: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
              </div>
            </div>
            
            {/* Status */}
            <div>
               <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
               <select
                  value={progress}
                  onChange={(e) => onProgress(e.target.value as any)}
                  className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                  <option value="all">All</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
            </div>
        </div>

        {/* History Toggle */}
        <div className="flex items-center pb-1">
          <button
            onClick={() => onToggleHistory(!showHistory)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showHistory ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showHistory ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
          <span className="ml-3 text-sm font-medium text-gray-900 flex items-center gap-1">
            <History className="w-4 h-4" />
            Include Past
          </span>
        </div>
      </div>
    </div>
  );
};

export default IncomeExpenseFilters;