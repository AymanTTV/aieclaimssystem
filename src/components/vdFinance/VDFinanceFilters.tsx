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
  const startStr = dateRange.start ? dateRange.start.toISOString().slice(0, 10) : '';
  const endStr   = dateRange.end ? dateRange.end.toISOString().slice(0, 10) : '';

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
        {/* Search spans 2 cols on sm+ */}
        <div className="relative sm:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by name, reference, or registration…"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Profit Status */}
        <div className="flex sm:justify-end">
          <select
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value as ProfitStatusFilter)}
            className="block w-full sm:w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          >
            <option value="all">All</option>
            <option value="unpaid">Unpaid Profit</option>
            <option value="paid">Paid Profit</option>
            <option value="cleared">No Profit</option>
          </select>
        </div>
      </div>

      {/* Dates row */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={startStr}
            onChange={e =>
              onDateRangeChange({
                ...dateRange,
                start: e.target.value ? new Date(e.target.value) : null,
              })
            }
            className="form-input mt-1 w-full"
            max={endStr || undefined}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={endStr}
            onChange={e =>
              onDateRangeChange({
                ...dateRange,
                end: e.target.value ? new Date(e.target.value) : null,
              })
            }
            className="form-input mt-1 w-full"
            min={startStr || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default VDFinanceFilters;
