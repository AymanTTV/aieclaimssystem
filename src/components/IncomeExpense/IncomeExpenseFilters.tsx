// src/components/income-expense/IncomeExpenseFilters.tsx

import React from 'react';
import { Search } from 'lucide-react';

interface Props {
  search: string;
  onSearch: (val: string) => void;
  typeFilter: 'all' | 'income' | 'expense';
  onType: (val: 'all' | 'income' | 'expense') => void;
  progress: 'all' | 'in-progress' | 'completed';
  onProgress: (val: 'all' | 'in-progress' | 'completed') => void;
  dateRange: { start: string; end: string };
  onDateRange: (range: { start: string; end: string }) => void;
}

const IncomeExpenseFilters: React.FC<Props> = ({
  search, onSearch,
  typeFilter, onType,
  progress, onProgress,
  dateRange, onDateRange
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
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

        <select
          value={typeFilter}
          onChange={(e) => onType(e.target.value as any)}
          className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={progress}
          onChange={(e) => onProgress(e.target.value as any)}
          className="block w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
          <option value="all">All Status</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => onDateRange({ ...dateRange, start: e.target.value })}
            className="block w-full border-gray-300 rounded-md focus:border-primary focus:ring-primary sm:text-sm"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => onDateRange({ ...dateRange, end: e.target.value })}
            className="block w-full border-gray-300 rounded-md focus:border-primary focus:ring-primary sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default IncomeExpenseFilters;
