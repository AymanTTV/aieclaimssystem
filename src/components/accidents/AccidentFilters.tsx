// src/components/accidents/AccidentFilters.tsx
import React from 'react';

interface AccidentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  claimStatusFilter: string;
  onClaimStatusFilterChange: (status: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
}

const AccidentFilters: React.FC<AccidentFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  claimStatusFilter,
  onClaimStatusFilterChange,
  dateRange,
  onDateRangeChange,
}) => {
  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm">
      {/* Optional inline search for pages that don't use the header search */}
      {/* Keep commented if you're already searching from header */}
      {/*
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by reference no, name, vehicle, location..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>
      */}

      {/* Filters grid: 1 → 2 → 3 → 4 */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Status</option>
            <option value="reported">Reported</option>
            <option value="investigating">Investigating</option>
            <option value="processing">Processing</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Types</option>
            <option value="fault">Fault</option>
            <option value="non-fault">Non-Fault</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Claim Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Claim Status</label>
          <select
            value={claimStatusFilter}
            onChange={(e) => onClaimStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Claim Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="settled">Settled</option>
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Date Range</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
              onChange={(e) =>
                onDateRangeChange({
                  ...dateRange,
                  start: e.target.value ? new Date(e.target.value) : null,
                })
              }
              className="form-input w-full"
            />
            <input
              type="date"
              value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
              min={dateRange.start ? dateRange.start.toISOString().split('T')[0] : undefined}
              onChange={(e) =>
                onDateRangeChange({
                  ...dateRange,
                  end: e.target.value ? new Date(e.target.value) : null,
                })
              }
              className="form-input w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccidentFilters;
