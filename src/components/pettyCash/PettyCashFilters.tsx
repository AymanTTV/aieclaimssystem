import React from 'react';

interface PettyCashFiltersProps {
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  amountRange: { min: number | null; max: number | null };
  onAmountRangeChange: (range: { min: number | null; max: number | null }) => void;
}

const PettyCashFilters: React.FC<PettyCashFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  amountRange,
  onAmountRangeChange,
}) => {
  const startStr = dateRange.start ? dateRange.start.toISOString().split('T')[0] : '';
  const endStr   = dateRange.end ? dateRange.end.toISOString().split('T')[0] : '';
  const minStr   = amountRange.min ?? '';
  const maxStr   = amountRange.max ?? '';

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      {/* Dates + Status */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* From */}
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

        {/* To */}
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

        {/* Status */}
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

        {/* Amount Min */}
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
      </div>

      {/* Amount Max — full width on mobile, pairs with Min on ≥380px */}
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
