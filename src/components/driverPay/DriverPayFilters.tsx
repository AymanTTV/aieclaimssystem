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
  periodDateRange: { start: Date | null; end: Date | null };
  onPeriodDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  periodOverlapDateRange: { start: Date | null; end: Date | null };
  onPeriodOverlapDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  lockFilter: string;
  onLockFilterChange: (value: string) => void;
  // 🟢 NEW: Usage filter props
  usageFilter: string;
  onUsageFilterChange: (value: string) => void;
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
  lockFilter,
  onLockFilterChange,
  usageFilter, // 🟢 New
  onUsageFilterChange, // 🟢 New
}) => {
  const overlapStart = periodOverlapDateRange.start ? periodOverlapDateRange.start.toISOString().split('T')[0] : '';
  const overlapEnd   = periodOverlapDateRange.end ? periodOverlapDateRange.end.toISOString().split('T')[0] : '';
  const exactStart   = periodDateRange.start ? periodDateRange.start.toISOString().split('T')[0] : '';
  const exactEnd     = periodDateRange.end ? periodDateRange.end.toISOString().split('T')[0] : '';

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      {/* Row 1: Search + quick filters */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 sm:gap-4 items-center">
        {/* Search */}
        <div className="relative xl:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by driver no, TID, name or phone…"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Compact selects on the right */}
        <div className="xl:col-span-3 flex flex-wrap gap-3 xl:justify-end">
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
          </select>

          <select
            id="collectionFilter"
            value={collectionFilter}
            onChange={(e) => onCollectionFilterChange(e.target.value)}
            className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="all">All Collections</option>
            <option value="OFFICE">OFFICE</option>
            <option value="CC">CC</option>
            <option value="ABDULAZIZ">ABDULAZIZ</option>
            <option value="OTHER">OTHER</option>
          </select>
            
          {/* 🟢 NEW: Usage Filter */}
          <select
            id="usageFilter"
            value={usageFilter}
            onChange={(e) => onUsageFilterChange(e.target.value)}
            className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="all">All Usage</option>
            <option value="high_usage">High Usage (£750+)</option>
            <option value="normal_usage">Normal Usage (£500-£749)</option>
            <option value="low_usage">Low Usage (£100-£499)</option>
            <option value="no_usage">No Usage (£0-£99)</option>
          </select>

          <select
            id="lockFilter"
            value={lockFilter}
            onChange={(e) => onLockFilterChange(e.target.value)}
            className="flex-1 min-w-[130px] pl-3 pr-8 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="active">Active Drivers</option>
            <option value="locked">Locked Drivers</option>
            <option value="all">All Drivers</option>
          </select>
        </div>
      </div>

      {/* Row 2: Period Overlap (2 inputs) */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label htmlFor="periodOverlapStartDate" className="block text-sm font-medium text-gray-700">Period Overlap Start</label>
          <input
            type="date"
            id="periodOverlapStartDate"
            value={overlapStart}
            onChange={(e) =>
              onPeriodOverlapDateRangeChange({
                ...periodOverlapDateRange,
                start: e.target.value ? new Date(e.target.value) : null
              })
            }
            className="form-input mt-1 w-full"
            max={overlapEnd || undefined}
          />
        </div>
        <div>
          <label htmlFor="periodOverlapEndDate" className="block text-sm font-medium text-gray-700">Period Overlap End</label>
          <input
            type="date"
            id="periodOverlapEndDate"
            value={overlapEnd}
            onChange={(e) =>
              onPeriodOverlapDateRangeChange({
                ...periodOverlapDateRange,
                end: e.target.value ? new Date(e.target.value) : null
              })
            }
            className="form-input mt-1 w-full"
            min={overlapStart || undefined}
          />
        </div>
      </div>

      {/* Row 3: Exact Period (2 inputs) */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label htmlFor="periodStartDate" className="block text-sm font-medium text-gray-700">Exact Period Start</label>
          <input
            type="date"
            id="periodStartDate"
            value={exactStart}
            onChange={(e) =>
              onPeriodDateRangeChange({
                ...periodDateRange,
                start: e.target.value ? new Date(e.target.value) : null
              })
            }
            className="form-input mt-1 w-full"
            max={exactEnd || undefined}
          />
        </div>
        <div>
          <label htmlFor="periodEndDate" className="block text-sm font-medium text-gray-700">Exact Period End</label>
          <input
            type="date"
            id="periodEndDate"
            value={exactEnd}
            onChange={(e) =>
              onPeriodDateRangeChange({
                ...periodDateRange,
                end: e.target.value ? new Date(e.target.value) : null
              })
            }
            className="form-input mt-1 w-full"
            min={exactStart || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default DriverPayFilters;