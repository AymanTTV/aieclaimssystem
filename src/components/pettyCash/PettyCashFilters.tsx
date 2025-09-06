import React from 'react';
import { usePettyCashCategories } from '../../hooks/usePettyCashCategories';
import { usePettyCashGroups } from '../../hooks/usePettyCashGroups';

interface PettyCashFiltersProps {
  moduleKey?: 'pettyCash' | 'aiePettyCash';
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  amountRange: { min: number | null; max: number | null };
  onAmountRangeChange: (range: { min: number | null; max: number | null }) => void;
  categoryIdFilter: string;
  onCategoryIdFilterChange: (id: string) => void;
  groupIdFilter: string;
  onGroupIdFilterChange: (id: string) => void;
}

const PettyCashFilters: React.FC<PettyCashFiltersProps> = ({
  moduleKey = 'pettyCash',
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  amountRange,
  onAmountRangeChange,
  categoryIdFilter,
  onCategoryIdFilterChange,
  groupIdFilter,
  onGroupIdFilterChange,
}) => {
  const startStr = dateRange.start ? dateRange.start.toISOString().split('T')[0] : '';
  const endStr   = dateRange.end ? dateRange.end.toISOString().split('T')[0] : '';
  const minStr   = amountRange.min ?? '';
  const maxStr   = amountRange.max ?? '';
  const { categories } = usePettyCashCategories(moduleKey);
  const { groups } = usePettyCashGroups(moduleKey);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={startStr}
            onChange={(e) =>
              onDateRangeChange({
                ...dateRange,
                start: e.target.value ? new Date(e.target.value) : null,
              })
            }
            className="form-input mt-1 w-full"
            max={endStr || undefined}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={endStr}
            onChange={(e) =>
              onDateRangeChange({
                ...dateRange,
                end: e.target.value ? new Date(e.target.value) : null,
              })
            }
            min={startStr || undefined}
            className="form-input mt-1 w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Min Amount</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={minStr}
            onChange={(e) =>
              onAmountRangeChange({
                ...amountRange,
                min: e.target.value !== '' ? parseFloat(e.target.value) : null,
              })
            }
            className="form-input mt-1 w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={categoryIdFilter}
            onChange={(e) => onCategoryIdFilterChange(e.target.value)}
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
            onChange={(e) => onGroupIdFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
        <div className="min-[380px]:col-start-2">
          <label className="block text-sm font-medium text-gray-700">Max Amount</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder="0.00"
            value={maxStr}
            onChange={(e) =>
              onAmountRangeChange({
                ...amountRange,
                max: e.target.value !== '' ? parseFloat(e.target.value) : null,
              })
            }
            className="form-input mt-1 w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default PettyCashFilters;
