// src/components/vatRecord/VATRecordFilters.tsx
import React from 'react'
import { Search } from 'lucide-react'

interface VATRecordFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  dateRange: { start: Date | null; end: Date | null }
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void
  amountRange: { min: number | null; max: number | null }
  onAmountRangeChange: (range: { min: number | null; max: number | null }) => void
}

const VATRecordFilters: React.FC<VATRecordFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
  amountRange,
  onAmountRangeChange,
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
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by receipt no, supplier, or customer…"
          className="form-input mt-1 block w-full pl-10 pr-3"
        />
      </div>

      {/* Filters grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="form-select mt-1 block w-full"
          >
            <option value="all">All Status</option>
            <option value="awaiting">Awaiting</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={dateRange.start?.toISOString().slice(0, 10) || ''}
            onChange={e =>
              onDateRangeChange({
                ...dateRange,
                start: e.target.value ? new Date(e.target.value) : null,
              })
            }
            className="form-input mt-1 block w-full"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={dateRange.end?.toISOString().slice(0, 10) || ''}
            onChange={e =>
              onDateRangeChange({
                ...dateRange,
                end: e.target.value ? new Date(e.target.value) : null,
              })
            }
            min={dateRange.start?.toISOString().slice(0, 10)}
            className="form-input mt-1 block w-full"
          />
        </div>

        {/* Min Gross */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Min Gross</label>
          <input
            type="number"
            placeholder="0.00"
            value={amountRange.min ?? ''}
            onChange={e =>
              onAmountRangeChange({
                ...amountRange,
                min: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="form-input mt-1 block w-full"
          />
        </div>

        {/* Max Gross */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Max Gross</label>
          <input
            type="number"
            placeholder="0.00"
            value={amountRange.max ?? ''}
            onChange={e =>
              onAmountRangeChange({
                ...amountRange,
                max: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            min={amountRange.min ?? undefined}
            className="form-input mt-1 block w-full"
          />
        </div>
      </div>
    </div>
  )
}

export default VATRecordFilters
