// src/components/finance/InvoiceFilters.tsx
import React, { useMemo } from 'react';
import { Search } from 'lucide-react';
import { Account } from '../../types/finance';
import SearchableSelect from '../ui/SearchableSelect';

interface InvoiceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  categoryFilter: string | string[];
  onCategoryFilterChange: (category: string | string[]) => void;
  accountFilter: string | string[];
  onAccountFilterChange: (account: string | string[]) => void;
  groupFilter: string | string[];
  onGroupFilterChange: (group: string | string[]) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  categories: string[];
  accounts: Account[];
  groups: { id: string; name: string }[];
  showCompleted: boolean;
  onShowCompletedChange: (show: boolean) => void;
}

const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  searchQuery, onSearchChange,
  statusFilter, onStatusFilterChange,
  categoryFilter, onCategoryFilterChange,
  accountFilter, onAccountFilterChange,
  groupFilter, onGroupFilterChange,
  dateRange, onDateRangeChange,
  categories, accounts, groups,
  showCompleted, onShowCompletedChange
}) => {

  const categoryOptions = useMemo(() => [{ id: 'all', label: 'All Categories' }, ...categories.map(c => ({ id: c, label: c }))], [categories]);
  
  // Filter out accounts that start with 'aie' or 'AIE'
  const accountOptions = useMemo(() => [
    { id: 'all', label: 'All Accounts' }, 
    ...accounts
      .filter(a => !(a.name && a.name.toLowerCase().startsWith('aie')))
      .map(a => ({ id: a.id, label: a.name }))
  ], [accounts]);
  
  const groupOptions = useMemo(() => [{ id: 'all', label: 'All Groups' }, ...groups.map(g => ({ id: g.id, label: g.name }))], [groups]);

  const isAll = (val: string | string[]) => {
    if (Array.isArray(val)) return val.length === 0 || val.includes('all') || (val.length === 1 && val[0] === '');
    return val === 'all' || val === '';
  };

  const createMultiHandler = (onChange: (val: string | string[]) => void) => (val: any) => {
    if (val == null) return onChange([]);
    if (Array.isArray(val)) {
      const cleaned = val.filter(Boolean);
      if (cleaned.includes('all')) return onChange(['all']);
      return onChange(cleaned.length === 0 ? [] : cleaned);
    }
    if (val === '') return onChange([]);
    if (val === 'all') return onChange(['all']);
    return onChange(val);
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-1/3">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search invoices, clients, or vehicles..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:bg-white focus:ring-primary focus:border-primary sm:text-sm transition-colors"
          />
        </div>
        
        <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => onShowCompletedChange(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
          />
          <span className="text-sm font-medium text-gray-700">Show Completed / Paid</span>
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Status */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full min-h-[38px] border border-gray-300 rounded-md bg-white text-sm focus:ring-primary focus:border-primary px-3"
            >
              <option value="all">All Status</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="pending">Pending</option>
              <option value="unpaid">Unpaid</option>
              <option value="overdue">Overdue</option>
              {showCompleted && <option value="paid">Paid</option>}
            </select>
          </div>
        </div>

        {/* Accounts */}
        <SearchableSelect
          label="Account"
          value={accountFilter}
          onChange={createMultiHandler(onAccountFilterChange)}
          options={accountOptions}
          isClearable={!isAll(accountFilter)}
          isMulti={true}
        />

        {/* Groups */}
        <SearchableSelect
          label="Group"
          value={groupFilter}
          onChange={createMultiHandler(onGroupFilterChange)}
          options={groupOptions}
          isClearable={!isAll(groupFilter)}
          isMulti={true}
        />

        {/* Category */}
        <SearchableSelect
          label="Category"
          value={categoryFilter}
          onChange={createMultiHandler(onCategoryFilterChange)}
          options={categoryOptions}
          isClearable={!isAll(categoryFilter)}
          isMulti={true}
        />

        {/* Dates */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null })
            }
            className="w-full min-h-[38px] border border-gray-300 rounded-md bg-white text-sm focus:ring-primary focus:border-primary px-3"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onDateRangeChange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null })
            }
            min={dateRange.start ? dateRange.start.toISOString().split('T')[0] : undefined}
            className="w-full min-h-[38px] border border-gray-300 rounded-md bg-white text-sm focus:ring-primary focus:border-primary px-3"
          />
        </div>
      </div>
    </div>
  );
};

export default InvoiceFilters;