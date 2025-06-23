// src/components/vdFinance/VDFinanceFilters.tsx
import React from 'react';
import { Search } from 'lucide-react';

export type ProfitStatusFilter = 'all' | 'unpaid' | 'paid' | 'cleared';

interface VDFinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;

  statusFilter: ProfitStatusFilter;
  onStatusChange: (status: ProfitStatusFilter) => void;
}

const VDFinanceFilters: React.FC<VDFinanceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusChange,
}) => {
  return (
    <div className="space-y-4">

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by name, reference, or registration..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      {/* Date Range Filter */}
      <div className="grid grid-cols-2 gap-4">
        <input
          type="date"
          value={dateRange.start?.toISOString().slice(0,10) || ''}
          onChange={e =>
            onDateRangeChange({
              ...dateRange,
              start: e.target.value ? new Date(e.target.value) : null,
            })
          }
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
        <input
          type="date"
          value={dateRange.end?.toISOString().slice(0,10) || ''}
          onChange={e =>
            onDateRangeChange({
              ...dateRange,
              end: e.target.value ? new Date(e.target.value) : null,
            })
          }
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>

      {/* Profit Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Profit Status
        </label>
        <select
          value={statusFilter}
          onChange={e => onStatusChange(e.target.value as ProfitStatusFilter)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="all">All</option>
          <option value="unpaid">Unpaid Profit</option>
          <option value="paid">Paid Profit</option>
          <option value="cleared">No Profit</option>
        </select>
      </div>
    </div>
  );
};

export default VDFinanceFilters;
