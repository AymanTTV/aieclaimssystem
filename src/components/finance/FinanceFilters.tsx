// src/components/finance/FinanceFilters.tsx
import React, { useMemo } from 'react';
import { Customer } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import SearchableSelect from '../ui/SearchableSelect'; 

interface FinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;
  onStatusFilterChange: (status: string) => void;
  
  // Updated types to allow arrays
  categoryFilter: string | string[];
  onCategoryFilterChange: (category: string | string[]) => void;
  
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  
  owner: string | string[];
  onOwnerChange: (owner: string | string[]) => void;
  owners: string[];
  
  customers?: Customer[];
  selectedCustomerId?: string | string[];
  onCustomerChange?: (customerId: string | string[]) => void;
  
  accountFilter: string | string[];
  onAccountFilterChange: (accountId: string | string[]) => void;
  accounts: { id: string, name: string }[];
  accountSummary: { income: number, expense: number, balance: number } | null;
  categories: string[];
  
  groupFilter: string | string[];
  onGroupFilterChange: (groupId: string | string[]) => void;
  groupOptions: { id: string; name: string }[];
  
  showLinked: 'all' | 'linked' | 'unlinked';
  onShowLinkedChange: (value: 'all' | 'linked' | 'unlinked') => void;

  recurringFilter: string;
  onRecurringFilterChange: (value: string) => void;
  recurringFrequency: string; 
  onRecurringFrequencyChange: (value: string) => void; 
}

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  dateRange, onDateRangeChange, type, onTypeChange, statusFilter, onStatusFilterChange,
  categoryFilter, onCategoryFilterChange, owner, onOwnerChange, owners, customers = [],
  selectedCustomerId, onCustomerChange, accountFilter, onAccountFilterChange, accounts,
  groupFilter, onGroupFilterChange, groupOptions, categories, showLinked, onShowLinkedChange,
  recurringFilter, onRecurringFilterChange,
  recurringFrequency, onRecurringFrequencyChange, 
}) => {
  const { formatCurrency } = useFormattedDisplay();

  const categoryOptions = useMemo(() => [
    { id: 'all', label: 'All Categories' },
    ...categories.map((cat) => ({ id: cat, label: cat }))
  ], [categories]);

  const groupSelectOptions = useMemo(() => [
    { id: 'all', label: 'All Groups' },
    { id: 'none', label: 'No Group Assigned' },
    ...groupOptions.map((g) => ({ id: g.id, label: g.name }))
  ], [groupOptions]);

  const ownerOptions = useMemo(() => [
    { id: 'all', label: 'All Owners' },
    { id: 'no_owner_assigned', label: 'No Vehicle Assigned' },
    ...owners.map((o) => ({ id: o, label: o }))
  ], [owners]);

  const customerOptions = useMemo(() => [
    { id: 'all', label: 'All Customers' },
    ...customers.map((c) => ({ id: c.id, label: c.name }))
  ], [customers]);

  const accountOptions = useMemo(() => [
    { id: 'all', label: 'All Accounts' },
    { id: 'no_account_assigned', label: 'No Account Assigned' },
    ...accounts.map((acc) => ({ id: acc.id, label: acc.name }))
  ], [accounts]);

  // Helper to detect if a value is "All" (either string 'all' or array containing it/empty)
  const isAll = (val: string | string[]) => {
      if (Array.isArray(val)) return val.length === 0 || val.includes('all') || (val.length === 1 && val[0] === '');
      return val === 'all' || val === '';
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* From */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">From</label>
          <input type="date" value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''} onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value ? new Date(e.target.value) : null })} className="form-input mt-1 w-full" />
        </div>
        {/* To */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">To</label>
          <input type="date" value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''} onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value ? new Date(e.target.value) : null })} min={dateRange.start ? dateRange.start.toISOString().split('T')[0] : undefined} className="form-input mt-1 w-full" />
        </div>
        
        {/* Type */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Type</label>
          <select value={type} onChange={(e) => onTypeChange(e.target.value as typeof type)} className="form-select mt-1 w-full">
            <option value="all">All Types</option><option value="income">Income</option><option value="expense">Expense</option>
          </select>
        </div>
        
        {/* Payment Status */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Payment Status</label>
          <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} className="form-select mt-1 w-full">
            <option value="all">All Status</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="partially_paid">Partially Paid</option>
          </select>
        </div>

        {/* Category (Multi) */}
        <SearchableSelect
          label="Category"
          value={categoryFilter}
          onChange={onCategoryFilterChange}
          options={categoryOptions}
          isClearable={!isAll(categoryFilter)}
          isMulti={true}
        />

        {/* Group (Multi) */}
        <SearchableSelect
          label="Group"
          value={groupFilter}
          onChange={onGroupFilterChange}
          options={groupSelectOptions}
          isClearable={!isAll(groupFilter)}
          isMulti={true}
        />

        {/* Owner (Multi) */}
        <SearchableSelect
          label="Owner"
          value={owner}
          onChange={onOwnerChange}
          options={ownerOptions}
          isClearable={!isAll(owner)}
          isMulti={true}
        />

        {/* Customer (Multi) */}
        {onCustomerChange && (
          <SearchableSelect
            label="Customer"
            value={selectedCustomerId || 'all'} 
            onChange={onCustomerChange}
            options={customerOptions}
            isClearable={!isAll(selectedCustomerId || 'all')}
            isMulti={true}
          />
        )}

        {/* Account (Multi) */}
        <SearchableSelect
            label="Account"
            value={accountFilter}
            onChange={onAccountFilterChange}
            options={accountOptions}
            isClearable={!isAll(accountFilter)}
            isMulti={true}
        />

        {/* Linked Status */}
        <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Linked Status</label>
            <select value={showLinked} onChange={(e) => onShowLinkedChange(e.target.value as any)} className="form-select mt-1 w-full">
                <option value="all">All Transactions</option><option value="linked">Show Linked Only</option><option value="unlinked">Show Unlinked Only</option>
            </select>
        </div>

        {/* Recurring Status */}
        <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Recurring</label>
            <select value={recurringFilter} onChange={(e) => onRecurringFilterChange(e.target.value)} className="form-select mt-1 w-full">
                <option value="all">All</option>
                <option value="active_recurring">Active Only</option>
                <option value="recurring_history">History Only</option>
                <option value="non_recurring">Non-Recurring</option>
            </select>
        </div>

        {/* Period */}
        {recurringFilter !== 'non_recurring' && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Period</label>
            <select value={recurringFrequency} onChange={(e) => onRecurringFrequencyChange(e.target.value)} className="form-select mt-1 w-full">
                <option value="all">All Periods</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="biannually">Biannually</option>
                <option value="yearly">Yearly</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceFilters;