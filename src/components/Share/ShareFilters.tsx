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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Bar */}
        <div className="relative">
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

        {/* Status Dropdown */}
        <select
          value={status}
          onChange={(e) => onStatus(e.target.value as any)}
          className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        {/* Date Range Filter */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              onDateRange({ ...dateRange, start: e.target.value })
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              onDateRange({ ...dateRange, end: e.target.value })
            }
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
        </div>
      </div>
    </div>
  )
}

export default ShareFilters
