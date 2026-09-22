// src/components/driverPay/DriverPayFilters.tsx
import React from 'react';
import { Search } from 'lucide-react';
import { useDriverGroups } from '../../hooks/useDriverGroups'; // 🟢 Added import for groups

interface DriverPayFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  collectionFilter: string;
  onCollectionFilterChange: (collection: string) => void;
  // 🟢 NEW: Group filter props
  groupIdFilter: string;
  onGroupIdFilterChange: (groupId: string) => void;
  periodDateRange: { start: Date | null; end: Date | null };
  onPeriodDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  periodOverlapDateRange: { start: Date | null; end: Date | null };
  onPeriodOverlapDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  lockFilter: string;
  onLockFilterChange: (value: string) => void;
  // 🟢 Usage filter props
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
  groupIdFilter, // 🟢 New
  onGroupIdFilterChange, // 🟢 New
  periodDateRange,
  onPeriodDateRangeChange,
  periodOverlapDateRange,
  onPeriodOverlapDateRangeChange,
  lockFilter,
  onLockFilterChange,
  usageFilter,
  onUsageFilterChange,
}) => {
  const { groups } = useDriverGroups(); // 🟢 Fetch driver groups

  const overlapStart = periodOverlapDateRange.start ? periodOverlapDateRange.start.toISOString().split('T')[0] : '';
  const overlapEnd   = periodOverlapDateRange.end ? periodOverlapDateRange.end.toISOString().split('T')[0] : '';
  const exactStart   = periodDateRange.start ? periodDateRange.start.toISOString().split('T')[0] : '';
  const exactEnd     = periodDateRange.end ? periodDateRange.end.toISOString().split('T')[0] : '';

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs p-4 sm:p-5 text-[#0F172A] space-y-4">
      {/* Row 1: Search + quick filters */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 sm:gap-4 items-center">
        {/* Search */}
        <div className="relative xl:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by driver no, TID, name or phone…"
            className="block w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl leading-5 bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-xs"
          />
        </div>

        {/* Compact selects on the right */}
        <div className="xl:col-span-3 flex flex-wrap gap-3 xl:justify-end">
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="flex-1 min-w-[130px] pl-3 pr-8 py-2.5 border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
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
            className="flex-1 min-w-[130px] pl-3 pr-8 py-2.5 border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            <option value="all">All Collections</option>
            <option value="OFFICE">OFFICE</option>
            <option value="CC">CC</option>
            <option value="ABDULAZIZ">ABDULAZIZ</option>
            <option value="OTHER">OTHER</option>
          </select>

          {/* 🟢 NEW: Groups Filter */}
          <select
            id="groupIdFilter"
            value={groupIdFilter}
            onChange={(e) => onGroupIdFilterChange(e.target.value)}
            className="flex-1 min-w-[130px] pl-3 pr-8 py-2.5 border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            <option value="all">All Groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
            
          {/* Usage Filter */}
          <select
            id="usageFilter"
            value={usageFilter}
            onChange={(e) => onUsageFilterChange(e.target.value)}
            className="flex-1 min-w-[130px] pl-3 pr-8 py-2.5 border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
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
            className="flex-1 min-w-[130px] pl-3 pr-8 py-2.5 border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
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
          <label htmlFor="periodOverlapStartDate" className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Period Overlap Start</label>
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
            className="block w-full px-3 py-2 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
            max={overlapEnd || undefined}
          />
        </div>
        <div>
          <label htmlFor="periodOverlapEndDate" className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Period Overlap End</label>
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
            className="block w-full px-3 py-2 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
            min={overlapStart || undefined}
          />
        </div>
      </div>

      {/* Row 3: Exact Period (2 inputs) */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label htmlFor="periodStartDate" className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Exact Period Start</label>
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
            className="block w-full px-3 py-2 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
            max={exactEnd || undefined}
          />
        </div>
        <div>
          <label htmlFor="periodEndDate" className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Exact Period End</label>
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
            className="block w-full px-3 py-2 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
            min={exactStart || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default DriverPayFilters;