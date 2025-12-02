// src/components/share/ShareFilters.tsx

import React, { useEffect, useState } from 'react'
import { Search, History, Filter, ArrowUpDown } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'

interface ShareFiltersProps {
  search: string
  onSearch: (value: string) => void
  status: 'all' | 'in-progress' | 'completed'
  onStatus: (value: 'all' | 'in-progress' | 'completed') => void
  
  // --- NEW PROPS ---
  typeFilter: 'all' | 'income' | 'expense'
  onTypeFilter: (value: 'all' | 'income' | 'expense') => void
  sortOrder: 'newest' | 'oldest' | 'highest' | 'lowest'
  onSortOrder: (value: 'newest' | 'oldest' | 'highest' | 'lowest') => void
  // ----------------
  
  dateRange: { start: string; end: string }
  onDateRange: (range: { start: string; end: string }) => void
  showHistory: boolean
  onToggleHistory: (val: boolean) => void
  category: string
  onCategory: (val: string) => void
}

const ShareFilters: React.FC<ShareFiltersProps> = ({
  search,
  onSearch,
  status,
  onStatus,
  typeFilter,
  onTypeFilter,
  sortOrder,
  onSortOrder,
  dateRange,
  onDateRange,
  showHistory,
  onToggleHistory,
  category,
  onCategory
}) => {
  const [categories, setCategories] = useState<string[]>([])

  // Fetch categories for the filter dropdown
  useEffect(() => {
    getDocs(collection(db, 'shareCategories')).then(snap => {
      const cats = snap.docs.map(d => d.data().name).sort()
      setCategories(cats)
    })
  }, [])

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
      {/* Top Row: Search and Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-center">
        
        {/* Search - Spans 4 columns on large screens */}
        <div className="relative lg:col-span-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search client, ref or vehicle..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Type Filter (Income/Expense) - Spans 2 cols */}
        <div className="lg:col-span-2">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => onTypeFilter(e.target.value as any)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                    <option value="all">All Types</option>
                    <option value="income">Income Only</option>
                    <option value="expense">Expense Only</option>
                </select>
            </div>
        </div>

        {/* Category Filter - Spans 2 cols */}
        <div className="lg:col-span-2">
          <select
            value={category}
            onChange={(e) => onCategory(e.target.value)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Status - Spans 2 cols */}
        <div className="lg:col-span-2">
          <select
            value={status}
            onChange={(e) => onStatus(e.target.value as any)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Sort Order - Spans 2 cols */}
        <div className="lg:col-span-2">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ArrowUpDown className="h-4 w-4 text-gray-400" />
                </div>
                <select
                    value={sortOrder}
                    onChange={(e) => onSortOrder(e.target.value as any)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="highest">Highest Amount</option>
                    <option value="lowest">Lowest Amount</option>
                </select>
            </div>
        </div>

      </div>

      {/* Second Row: Date Range + History Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-end justify-between pt-2 border-t border-gray-100">
        
        {/* Date Range Inputs */}
        <div className="flex gap-4 w-full sm:w-auto">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRange({ ...dateRange, start: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              max={dateRange.end || undefined}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRange({ ...dateRange, end: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
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