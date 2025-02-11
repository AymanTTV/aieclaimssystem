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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Date Range Filter */}
      <div className="flex space-x-2">
        <input
          type="date"
          value={dateRange.start?.toISOString().split('T')[0] || ''}
          onChange={(e) => onDateRangeChange({
            ...dateRange,
            start: e.target.value ? new Date(e.target.value) : null
          })}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
        <input
          type="date"
          value={dateRange.end?.toISOString().split('T')[0] || ''}
          onChange={(e) => onDateRangeChange({
            ...dateRange,
            end: e.target.value ? new Date(e.target.value) : null
          })}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>

      {/* Status Filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
      >
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="paid">Paid</option>
        <option value="unpaid">Unpaid</option>
      </select>

      {/* Amount Range Filter */}
      <div className="flex space-x-2">
        <input
          type="number"
          placeholder="Min Amount"
          value={amountRange.min || ''}
          onChange={(e) => onAmountRangeChange({
            ...amountRange,
            min: e.target.value ? parseFloat(e.target.value) : null
          })}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
        <input
          type="number"
          placeholder="Max Amount"
          value={amountRange.max || ''}
          onChange={(e) => onAmountRangeChange({
            ...amountRange,
            max: e.target.value ? parseFloat(e.target.value) : null
          })}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>
    </div>
  );
};

export default PettyCashFilters;