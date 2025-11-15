// src/components/vdFinance/VDFinanceFilters.tsx
import React from 'react';
import { Search } from 'lucide-react';
import { useVDFinanceCategories } from '../../hooks/useVDFinanceCategories';
import { useVDFinanceGroups } from '../../hooks/useVDFinanceGroups';

export type ProfitStatusFilter = 'all' | 'unpaid' | 'paid' | 'cleared';

interface VDFinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  statusFilter: ProfitStatusFilter;
  onStatusChange: (status: ProfitStatusFilter) => void;

  // NEW:
  categoryIdFilter: string;
  onCategoryIdFilterChange: (id: string) => void;
  groupIdFilter: string;
  onGroupIdFilterChange: (id: string) => void;
  amountRange: { min: number | null; max: number | null };
  onAmountRangeChange: (r: { min: number | null; max: number | null }) => void;
  claimReason: 'any' | 'VD' | 'H' | 'S' | 'PI';
  onClaimReasonChange: (v: 'any' | 'VD' | 'H' | 'S' | 'PI') => void;
}

const VDFinanceFilters: React.FC<VDFinanceFiltersProps> = ({
  searchQuery, onSearchChange,
  dateRange, onDateRangeChange,
  statusFilter, onStatusChange,

  categoryIdFilter, onCategoryIdFilterChange,
  groupIdFilter, onGroupIdFilterChange,
  amountRange, onAmountRangeChange,
  claimReason, onClaimReasonChange,
}) => {
  const startStr = dateRange.start ? dateRange.start.toISOString().slice(0, 10) : '';
  const endStr   = dateRange.end ? dateRange.end.toISOString().slice(0, 10) : '';

  const { categories } = useVDFinanceCategories();
  const { groups } = useVDFinanceGroups();

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

      {/* Row 2: Dates + Category + Group */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={startStr}
            onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null })}
            className="form-input mt-1 w-full"
            max={endStr || undefined}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={endStr}
            onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null })}
            className="form-input mt-1 w-full"
            min={startStr || undefined}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={categoryIdFilter}
            onChange={e => onCategoryIdFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Group</label>
          <select
            value={groupIdFilter}
            onChange={e => onGroupIdFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All</option>
            <option value="none">None Group Assigned</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      {/* Row 3: Amount range + Claim reason */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-3 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Total (£)</label>
          <input
            type="number"
            value={amountRange.min ?? ''}
            onChange={e => onAmountRangeChange({ ...amountRange, min: e.target.value ? parseFloat(e.target.value) : null })}
            className="form-input mt-1 w-full"
            step="0.01"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Total (£)</label>
          <input
            type="number"
            value={amountRange.max ?? ''}
            onChange={e => onAmountRangeChange({ ...amountRange, max: e.target.value ? parseFloat(e.target.value) : null })}
            className="form-input mt-1 w-full"
            step="0.01"
            min={amountRange.min ?? 0}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Claim Reason</label>
          <select
            value={claimReason}
            onChange={e => onClaimReasonChange(e.target.value as any)}
            className="form-select mt-1 w-full"
          >
            <option value="any">Any</option>
            <option value="VD">VD</option>
            <option value="H">H</option>
            <option value="S">S</option>
            <option value="PI">PI</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default VDFinanceFilters;