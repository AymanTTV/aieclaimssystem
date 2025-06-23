import React from 'react';

interface PettyCashFiltersProps {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  amountRange: {
    min: number | null;
    max: number | null;
  };
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
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onDateRangeChange({
                ...dateRange,
                start: e.target.value ? new Date(e.target.value) : null,
              })
            }
            className="form-input mt-1"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onDateRangeChange({
                ...dateRange,
                end: e.target.value ? new Date(e.target.value) : null,
              })
            }
            min={dateRange.start ? dateRange.start.toISOString().split('T')[0] : undefined}
            className="form-input mt-1"
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="form-select mt-1"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        {/* Min Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Amount</label>
          <input
            type="number"
            placeholder="0.00"
            value={amountRange.min ?? ''}
            onChange={(e) =>
              onAmountRangeChange({
                ...amountRange,
                min: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="form-input mt-1"
          />
        </div>

        {/* Max Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Amount</label>
          <input
            type="number"
            placeholder="0.00"
            value={amountRange.max ?? ''}
            onChange={(e) =>
              onAmountRangeChange({
                ...amountRange,
                max: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="form-input mt-1"
          />
        </div>
      </div>
    </div>
  );
};

export default PettyCashFilters;
