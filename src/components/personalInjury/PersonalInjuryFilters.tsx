import React from 'react';
import { Search } from 'lucide-react';

interface PersonalInjuryFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
}

const PersonalInjuryFilters: React.FC<PersonalInjuryFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
}) => {
  return (
    <div className="bg-[#16192B] border border-[#2B314E] rounded-2xl shadow-xl p-4 sm:p-5 text-white space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Search</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, contact number, or location..."
            className="block w-full pl-10 pr-3.5 py-2.5 border border-[#2B314E] rounded-xl leading-5 bg-[#0F111A] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-inner transition-all"
          />
        </div>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#2B314E]">
        {/* Status Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="block w-full rounded-xl border border-[#2B314E] bg-[#0F111A] text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Date Range</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
              onChange={(e) => onDateRangeChange({
                ...dateRange,
                start: e.target.value ? new Date(e.target.value) : null
              })}
              className="block w-full rounded-xl border border-[#2B314E] bg-[#0F111A] text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Start Date"
            />
            <input
              type="date"
              value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
              onChange={(e) => onDateRangeChange({
                ...dateRange,
                end: e.target.value ? new Date(e.target.value) : null
              })}
              className="block w-full rounded-xl border border-[#2B314E] bg-[#0F111A] text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="End Date"
              min={dateRange.start ? dateRange.start.toISOString().split('T')[0] : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInjuryFilters;
