// src/components/vatRecord/VATRecordFilters.tsx

import React from 'react';
import { Search } from 'lucide-react';

interface VATRecordFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
}

const VATRecordFilters: React.FC<VATRecordFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
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
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by receipt no, supplier, or customer..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="all">All Status</option>
          <option value="awaiting">Awaiting</option>
          <option value="processing">Processing</option>
          <option value="paid">Paid</option>
        </select>

        {/* Date Range Filter */}
        <div className="flex space-x-2">
          <input
            type="date"
            value={dateRange.start?.toISOString().split('T')[0] || ''}
            onChange={(e) => onDateRangeChange({
              ...dateRange,
              start: e.target.value ? new Date(e.target.value) : null
            })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          <input
            type="date"
            value={dateRange.end?.toISOString().split('T')[0] || ''}
            onChange={(e) => onDateRangeChange({
              ...dateRange,
              end: e.target.value ? new Date(e.target.value) : null
            })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default VATRecordFilters;
