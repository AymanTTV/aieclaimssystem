// src/components/share/ShareFilters.tsx

import React from 'react'
import { Search, History } from 'lucide-react' // Import History icon

interface ShareFiltersProps {
  search: string
  onSearch: (value: string) => void
  status: 'all' | 'in-progress' | 'completed'
  onStatus: (value: 'all' | 'in-progress' | 'completed') => void
  dateRange: { start: string; end: string }
  onDateRange: (range: { start: string; end: string }) => void
  // NEW PROPS
  showHistory: boolean
  onToggleHistory: (val: boolean) => void
}

const ShareFilters: React.FC<ShareFiltersProps> = ({
  search,
  onSearch,
  status,
  onStatus,
  dateRange,
  onDateRange,
  showHistory,
  onToggleHistory
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
        
        {/* Search */}
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

      {/* Second Row: Date Range + History Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
        
        {/* Date Range Inputs (Only active if History is ON, or you can leave them always active) */}
        <div className={`flex gap-4 w-full sm:w-auto ${!showHistory ? 'opacity-50' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-gray-700">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRange({ ...dateRange, start: e.target.value })}
              disabled={!showHistory} // Optional: disable manual dates when in "Current Pot" mode
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm disabled:bg-gray-100"
              max={dateRange.end || undefined}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRange({ ...dateRange, end: e.target.value })}
              disabled={!showHistory} // Optional
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm disabled:bg-gray-100"
              min={dateRange.start || undefined}
            />
          </div>
        </div>

        {/* History Toggle Switch */}
        <div className="flex items-center">
           <button
             onClick={() => onToggleHistory(!showHistory)}
             className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
               showHistory ? 'bg-primary' : 'bg-gray-200'
             }`}
           >
             <span
               className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                 showHistory ? 'translate-x-5' : 'translate-x-0'
               }`}
             />
           </button>
           <span className="ml-3 text-sm font-medium text-gray-900 flex items-center gap-2">
             <History className="w-4 h-4" />
             Include Past History
           </span>
        </div>

      </div>
    </div>
  )
}

export default ShareFilters