import React from 'react';
import { Search } from 'lucide-react';

interface AccidentFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
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
  dateRange = { start: null, end: null }, // Default value to avoid undefined
  onDateRangeChange,
}) => {
  const handleStartDateChange = (value: string) => {
    onDateRangeChange({
      ...dateRange,
      start: value ? new Date(value) : null,
    });
  };

  const handleEndDateChange = (value: string) => {
    onDateRangeChange({
      ...dateRange,
      end: value ? new Date(value) : null,
    });
  };

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
          placeholder="Search accidents..."
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
          <option value="reported">Reported</option>
          <option value="investigating">Investigating</option>
          <option value="processing">Processing</option>
          <option value="resolved">Resolved</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="all">All Types</option>
          <option value="fault">Fault</option>
          <option value="non-fault">Non-Fault</option>
          <option value="pending">Pending</option>
        </select>

        {/* Date Range Filter */}
        <div className="flex space-x-2">
          <input
            type="date"
            value={
              dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''
            }
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={
              dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''
            }
            onChange={(e) => handleEndDateChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            placeholder="End Date"
            min={
              dateRange.start
                ? dateRange.start.toISOString().split('T')[0]
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
};

export default AccidentFilters;
