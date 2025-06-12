// src/components/driverPay/DriverPayFilters.tsx

import React from 'react';
import { Search } from 'lucide-react';

interface DriverPayFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  collectionFilter: string;
  onCollectionFilterChange: (collection: string) => void;
  // Props for Exact Period Date Match Filter
  periodDateRange: { start: Date | null; end: Date | null };
  onPeriodDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  // New props for Period Overlap Date Filter
  periodOverlapDateRange: { start: Date | null; end: Date | null };
  onPeriodOverlapDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
}

const DriverPayFilters: React.FC<DriverPayFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  collectionFilter,
  onCollectionFilterChange,
  // Renamed prop
  periodDateRange,
  onPeriodDateRangeChange,
  // New props
  periodOverlapDateRange, // Updated prop name
  onPeriodOverlapDateRangeChange, // Updated prop name
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
          placeholder="Search by driver no, TID, name or phone..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Status Filter */}
        <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
        </div>

        {/* Collection Filter */}
        <div>
            <label htmlFor="collectionFilter" className="block text-sm font-medium text-gray-700 mb-1">Collection</label>
            <select
              id="collectionFilter"
              value={collectionFilter}
              onChange={(e) => onCollectionFilterChange(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="all">All Collections</option>
              <option value="OFFICE">OFFICE</option>
              <option value="CC">CC</option>
              <option value="ABDULAZIZ">ABDULAZIZ</option>
              <option value="OTHER">OTHER</option>
            </select>
        </div>

         {/* Period Overlap Date Range Filters (New Filter Logic) */}
         {/* Renamed labels */}
         <div className="col-span-full sm:col-span-2 grid grid-cols-2 gap-4">
            <div className="flex flex-col">
                <label htmlFor="periodOverlapStartDate" className="block text-sm font-medium text-gray-700 mb-1">Period Overlap Start</label>
                <input
                  type="date"
                  id="periodOverlapStartDate"
                  value={periodOverlapDateRange.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => onPeriodOverlapDateRangeChange({ // Updated handler name
                    ...periodOverlapDateRange,
                    start: e.target.value ? new Date(e.target.value) : null
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                />
            </div>
            <div className="flex flex-col">
                <label htmlFor="periodOverlapEndDate" className="block text-sm font-medium text-gray-700 mb-1">Period Overlap End</label>
                <input
                  type="date"
                  id="periodOverlapEndDate"
                  value={periodOverlapDateRange.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => onPeriodOverlapDateRangeChange({ // Updated handler name
                    ...periodOverlapDateRange,
                    end: e.target.value ? new Date(e.target.value) : null
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  min={periodOverlapDateRange.start ? periodOverlapDateRange.start.toISOString().split('T')[0] : undefined}
                />
            </div>
         </div>


        {/* Exact Period Date Range Filters (Existing Filter Logic) */}
         {/* Labels remain the same */}
        <div className="col-span-full sm:col-span-2 grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label htmlFor="periodStartDate" className="block text-sm font-medium text-gray-700 mb-1">Exact Period Start</label> {/* Adjusted label for clarity */}
            <input
              type="date"
              id="periodStartDate"
              value={periodDateRange.start?.toISOString().split('T')[0] || ''}
              onChange={(e) => onPeriodDateRangeChange({
                ...periodDateRange,
                start: e.target.value ? new Date(e.target.value) : null
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="periodEndDate" className="block text-sm font-medium text-gray-700 mb-1">Exact Period End</label> {/* Adjusted label for clarity */}
            <input
              type="date"
              id="periodEndDate"
              value={periodDateRange.end?.toISOString().split('T')[0] || ''}
              onChange={(e) => onPeriodDateRangeChange({
                ...periodDateRange,
                end: e.target.value ? new Date(e.target.value) : null
              })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              min={periodDateRange.start ? periodDateRange.start.toISOString().split('T')[0] : undefined}
            />
          </div>
        </div>

      </div> {/* End of Filter Controls grid */}
    </div>
  );
};

export default DriverPayFilters;