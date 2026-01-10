// src/components/vatRecord/VATRecordFilters.tsx
import React from 'react'
import { Search } from 'lucide-react'
import { useVATCategories } from '../../hooks/useVATCategories'
import { useVATGroups } from '../../hooks/useVATGroups'

interface VATRecordFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  dateRange: { start: Date | null; end: Date | null }
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void
  amountRange: { min: number | null; max: number | null }
  onAmountRangeChange: (range: { min: number | null; max: number | null }) => void
  categoryIdFilter: string
  onCategoryIdFilterChange: (id: string) => void
  groupIdFilter: string
  onGroupIdFilterChange: (id: string) => void
  dueDateFilter: string;
  onDueDateFilterChange: (date: string) => void;
  // --- NEW PROPS ---
  recurringFilter: string;
  onRecurringFilterChange: (val: string) => void;
  recurringFrequency: string;
  onRecurringFrequencyChange: (val: string) => void;
}

const VATRecordFilters: React.FC<VATRecordFiltersProps> = (props) => {
  const { categories } = useVATCategories();
  const { groups } = useVATGroups();
  const {
    searchQuery, onSearchChange,
    statusFilter, onStatusFilterChange,
    dateRange, onDateRangeChange,
    amountRange, onAmountRangeChange,
    categoryIdFilter, onCategoryIdFilterChange,
    groupIdFilter, onGroupIdFilterChange,
    dueDateFilter, onDueDateFilterChange,
    recurringFilter, onRecurringFilterChange,
    recurringFrequency, onRecurringFrequencyChange
  } = props;

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
        <input type="text" value={searchQuery} onChange={e => onSearchChange(e.target.value)} placeholder="Search by receipt no, inquiry/order no, supplier, REG no, VAT no, or customer…" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Status */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Status</label>
          <select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value)} className="form-select mt-1 w-full">
            <option value="all">All Status</option><option value="awaiting">Awaiting</option><option value="processing">Processing</option><option value="paid">Paid</option>
          </select>
        </div>
        {/* Date From */}
        <div><label className="block text-xs sm:text-sm font-medium text-gray-700">From</label><input type="date" value={dateRange.start?.toISOString().slice(0, 10) || ''} onChange={e => onDateRangeChange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null })} className="form-input mt-1 w-full" /></div>
        {/* Date To */}
        <div><label className="block text-xs sm:text-sm font-medium text-gray-700">To</label><input type="date" value={dateRange.end?.toISOString().slice(0, 10) || ''} onChange={e => onDateRangeChange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null })} min={dateRange.start?.toISOString().slice(0, 10)} className="form-input mt-1 w-full" /></div>
        
        {/* Recurring */}
        <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Recurring</label>
            <select value={recurringFilter} onChange={e => onRecurringFilterChange(e.target.value)} className="form-select mt-1 w-full">
                <option value="all">All</option><option value="active_recurring">Active Only</option><option value="recurring_history">History Only</option><option value="non_recurring">Non-Recurring</option>
            </select>
        </div>
        
        {/* Frequency - Show only if relevant */}
        {recurringFilter !== 'non_recurring' && (
            <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">Period</label>
                <select value={recurringFrequency} onChange={e => onRecurringFrequencyChange(e.target.value)} className="form-select mt-1 w-full">
                    <option value="all">All</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="biannually">Biannually</option><option value="yearly">Yearly</option>
                </select>
            </div>
        )}

        {/* Due Date */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Record Due Date</label>
          <input type="date" value={dueDateFilter} onChange={(e) => onDueDateFilterChange(e.target.value)} className="form-input mt-1 w-full" />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Category</label>
          <select value={categoryIdFilter} onChange={(e) => onCategoryIdFilterChange(e.target.value)} className="form-select mt-1 w-full">
            <option value="all">All</option>{categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>

        {/* Group */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Group</label>
          <select value={groupIdFilter} onChange={(e) => onGroupIdFilterChange(e.target.value)} className="form-select mt-1 w-full">
            <option value="all">All</option>{groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
          </select>
        </div>
        
        {/* Min Gross */}
        <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Min Gross</label>
            <input type="number" placeholder="0.00" value={amountRange.min ?? ''} onChange={e => onAmountRangeChange({ ...amountRange, min: e.target.value ? parseFloat(e.target.value) : null, })} className="form-input mt-1 w-full" />
        </div>
        {/* Max Gross */}
        <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Max Gross</label>
            <input type="number" placeholder="0.00" value={amountRange.max ?? ''} onChange={e => onAmountRangeChange({ ...amountRange, max: e.target.value ? parseFloat(e.target.value) : null, })} min={amountRange.min ?? undefined} className="form-input mt-1 w-full" />
        </div>
      </div>
    </div>
  )
}

export default VATRecordFilters