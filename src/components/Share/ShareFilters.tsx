// src/components/Share/ShareFilters.tsx
import React, { useEffect, useState } from 'react'
import { Search, History } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import SearchableSelect from '../ui/SearchableSelect'

interface ShareFiltersProps {
  search: string
  onSearch: (value: string) => void
  
  // Updated to handle multiple selections
  status: string[]
  onStatus: (value: string[]) => void
  
  typeFilter: string[]
  onTypeFilter: (value: string[]) => void
  
  recurringFilter: string[]
  onRecurringFilter: (val: string[]) => void

  category: string[]
  onCategory: (val: string[]) => void
  
  // Sort order remains single select
  sortOrder: 'newest' | 'oldest' | 'highest' | 'lowest'
  onSortOrder: (value: 'newest' | 'oldest' | 'highest' | 'lowest') => void

  dateRange: { start: string; end: string }
  onDateRange: (range: { start: string; end: string }) => void
  showHistory: boolean
  onToggleHistory: (val: boolean) => void
}

const ShareFilters: React.FC<ShareFiltersProps> = ({
  search, onSearch,
  status, onStatus,
  typeFilter, onTypeFilter,
  sortOrder, onSortOrder,
  recurringFilter, onRecurringFilter,
  dateRange, onDateRange,
  showHistory, onToggleHistory,
  category, onCategory
}) => {
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    getDocs(collection(db, 'shareCategories')).then(snap => {
      const cats = snap.docs.map(d => d.data().name).sort()
      setCategories(cats)
    })
  }, [])

  const typeOptions = [
    { id: 'all', label: 'All Types' },
    { id: 'income', label: 'Income Only' },
    { id: 'expense', label: 'Expense Only' }
  ];

  const categoryOptions = [
    { id: 'all', label: 'All Categories' },
    ...categories.map(c => ({ id: c, label: c }))
  ];

  const statusOptions = [
    { id: 'all', label: 'All Statuses' },
    { id: 'in-progress', label: 'In Progress' },
    { id: 'completed', label: 'Completed' }
  ];

  const sortOptions = [
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'highest', label: 'Highest Amount' },
    { id: 'lowest', label: 'Lowest Amount' }
  ];

  const recurringOptions = [
    { id: 'all', label: 'All Records' },
    { id: 'non_recurring', label: 'Non-Recurring Only' },
    { id: 'recurring_all', label: 'Recurring (All)' },
    { id: 'recurring_daily', label: 'Recurring (Daily)' },
    { id: 'recurring_weekly', label: 'Recurring (Weekly)' },
    { id: 'recurring_monthly', label: 'Recurring (Monthly)' },
    { id: 'recurring_quarterly', label: 'Recurring (Quarterly)' },
    { id: 'recurring_biannually', label: 'Recurring (Biannually)' },
    { id: 'recurring_yearly', label: 'Recurring (Yearly)' }
  ];

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-5">
      
      {/* Top Search & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search client, ref or vehicle..."
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-200">
           <button
             onClick={() => onToggleHistory(!showHistory)}
             className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
               showHistory ? 'bg-primary' : 'bg-gray-300'
             }`}
           >
             <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${ showHistory ? 'translate-x-5' : 'translate-x-0' }`} />
           </button>
           <span className="ml-3 text-sm font-semibold text-gray-700 flex items-center gap-2">
             <History className="w-4 h-4 text-gray-500" />
             Past Split History
           </span>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Grid Filters using SearchableSelect */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">From Date</label>
            <input type="date" value={dateRange.start} max={dateRange.end || undefined} onChange={(e) => onDateRange({ ...dateRange, start: e.target.value })} className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">To Date</label>
            <input type="date" value={dateRange.end} min={dateRange.start || undefined} onChange={(e) => onDateRange({ ...dateRange, end: e.target.value })} className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary" />
          </div>
        </div>

        {/* Added isMulti to all multi-select fields */}
        <div className="mt-0.5">
          <SearchableSelect label="Type" isMulti options={typeOptions} value={typeFilter} onChange={(val) => onTypeFilter(val as string[])} />
        </div>
        <div className="mt-0.5">
          <SearchableSelect label="Category" isMulti options={categoryOptions} value={category} onChange={(val) => onCategory(val as string[])} />
        </div>
        <div className="mt-0.5">
          <SearchableSelect label="Status" isMulti options={statusOptions} value={status} onChange={(val) => onStatus(val as string[])} />
        </div>
        <div className="space-y-4 mt-0.5">
          <SearchableSelect label="Sort Order" options={sortOptions} value={sortOrder} onChange={(val) => onSortOrder(val as any)} />
          <SearchableSelect label="Recurring" isMulti options={recurringOptions} value={recurringFilter} onChange={(val) => onRecurringFilter(val as string[])} />
        </div>
      </div>
    </div>
  )
}

export default ShareFilters