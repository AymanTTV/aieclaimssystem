// src/components/share/ShareFilters.tsx
import React from 'react'
import { Search } from 'lucide-react'

interface ShareFiltersProps {
  search: string
  onSearch: (value: string) => void
  status: 'all' | 'in-progress' | 'completed'
  onStatus: (value: 'all' | 'in-progress' | 'completed') => void
  dateRange: { start: string; end: string }
  onDateRange: (range: { start: string; end: string }) => void
}

const ShareFilters: React.FC<ShareFiltersProps> = ({
  search,
  onSearch,
  status,
  onStatus,
  dateRange,
  onDateRange
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
        {/* Search (spans 2 cols on sm+) */}
        <div className="relative sm:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by client name..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Status */}
        <div className="flex sm:justify-end">
          <select
            value={status}
            onChange={(e) => onStatus(e.target.value as any)}
            className="block w-full sm:w-56 py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => onDateRange({ ...dateRange, start: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            max={dateRange.end || undefined}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => onDateRange({ ...dateRange, end: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min={dateRange.start || undefined}
          />
        </div>
      </div>
    </div>
  )
}

export default ShareFilters
