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
    <div className="bg-[#16192B] border border-[#2B314E] rounded-2xl shadow-xl p-4 sm:p-5 text-white space-y-4">
      {/* Filters grid: 1 → 2 → 3 → 4 */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="block w-full px-3 py-2.5 text-sm font-medium border border-[#2B314E] rounded-xl bg-[#0F111A] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="block w-full px-3 py-2.5 text-sm font-medium border border-[#2B314E] rounded-xl bg-[#0F111A] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="fault">Fault</option>
            <option value="non-fault">Non-Fault</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Claim Status */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Claim Status</label>
          <select
            value={claimStatusFilter}
            onChange={(e) => onClaimStatusFilterChange(e.target.value)}
            className="block w-full px-3 py-2.5 text-sm font-medium border border-[#2B314E] rounded-xl bg-[#0F111A] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
              onChange={(e) =>
                onDateRangeChange({
                  ...dateRange,
                  start: e.target.value ? new Date(e.target.value) : null,
                })
              }
              className="block w-full px-2.5 py-2 text-xs sm:text-sm border border-[#2B314E] rounded-xl bg-[#0F111A] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="block w-full px-2.5 py-2 text-xs sm:text-sm border border-[#2B314E] rounded-xl bg-[#0F111A] text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccidentFilters;
