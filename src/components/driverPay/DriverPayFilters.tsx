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
  periodDateRange,
  onPeriodDateRangeChange,
  periodOverlapDateRange,
  onPeriodOverlapDateRangeChange,
}) => {
  return (
    <div className="space-y-6"> {/* Increased vertical space between sections */}
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

      {/* Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Status Filter */}
        <div>
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Status</label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="form-select mt-1 block w-full" /* Added form-select and mt-1 */
            >
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
        </div>

        {/* Collection Filter */}
        <div>
            <label htmlFor="collectionFilter" className="block text-sm font-medium text-gray-700">Collection</label>
            <select
              id="collectionFilter"
              value={collectionFilter}
              onChange={(e) => onCollectionFilterChange(e.target.value)}
              className="form-select mt-1 block w-full" /* Added form-select and mt-1 */
            >
              <option value="all">All Collections</option>
              <option value="OFFICE">OFFICE</option>
              <option value="CC">CC</option>
              <option value="ABDULAZIZ">ABDULAZIZ</option>
              <option value="OTHER">OTHER</option>
            </select>
        </div>

         {/* Period Overlap Date Range Filters */}
         {/* Using a nested grid for the two date inputs to ensure they span two columns on small/medium screens */}
         <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Adjusted col-span for larger screens */}
            <div>
                <label htmlFor="periodOverlapStartDate" className="block text-sm font-medium text-gray-700">Period Overlap Start</label>
                <input
                  type="date"
                  id="periodOverlapStartDate"
                  value={periodOverlapDateRange.start?.toISOString().split('T')[0] || ''}
                  onChange={(e) => onPeriodOverlapDateRangeChange({
                    ...periodOverlapDateRange,
                    start: e.target.value ? new Date(e.target.value) : null
                  })}
                  className="form-input mt-1 block w-full" /* Added form-input and mt-1 */
                />
            </div>
            <div>
                <label htmlFor="periodOverlapEndDate" className="block text-sm font-medium text-gray-700">Period Overlap End</label>
                <input
                  type="date"
                  id="periodOverlapEndDate"
                  value={periodOverlapDateRange.end?.toISOString().split('T')[0] || ''}
                  onChange={(e) => onPeriodOverlapDateRangeChange({
                    ...periodOverlapDateRange,
                    end: e.target.value ? new Date(e.target.value) : null
                  })}
                  className="form-input mt-1 block w-full" /* Added form-input and mt-1 */
                  min={periodOverlapDateRange.start ? periodOverlapDateRange.start.toISOString().split('T')[0] : undefined}
                />
            </div>
         </div>


        {/* Exact Period Date Range Filters */}
        {/* Using a nested grid for the two date inputs */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Adjusted col-span for larger screens */}
          <div>
            <label htmlFor="periodStartDate" className="block text-sm font-medium text-gray-700">Exact Period Start</label>
            <input
              type="date"
              id="periodStartDate"
              value={periodDateRange.start?.toISOString().split('T')[0] || ''}
              onChange={(e) => onPeriodDateRangeChange({
                ...periodDateRange,
                start: e.target.value ? new Date(e.target.value) : null
              })}
              className="form-input mt-1 block w-full" /* Added form-input and mt-1 */
            />
          </div>
          <div>
            <label htmlFor="periodEndDate" className="block text-sm font-medium text-gray-700">Exact Period End</label>
            <input
              type="date"
              id="periodEndDate"
              value={periodDateRange.end?.toISOString().split('T')[0] || ''}
              onChange={(e) => onPeriodDateRangeChange({
                ...periodDateRange,
                end: e.target.value ? new Date(e.target.value) : null
              })}
              className="form-input mt-1 block w-full" /* Added form-input and mt-1 */
              min={periodDateRange.start ? periodDateRange.start.toISOString().split('T')[0] : undefined}
            />
          </div>
        </div>

      </div> {/* End of Filter Controls grid */}
    </div>
  );
};

export default DriverPayFilters;