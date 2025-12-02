// src/components/finance/FinanceFilters.tsx
import React from 'react';
import { Customer } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface FinanceFiltersProps {
  // existing props
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;
  onStatusFilterChange: (status: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  owner: string;
  onOwnerChange: (owner: string) => void;
  owners: string[];
  customers?: Customer[];
  selectedCustomerId?: string;
  onCustomerChange?: (customerId: string) => void;
  accountFilter: string;
  onAccountFilterChange: (accountId: string) => void;
  accounts: { id: string, name: string }[];
  accountSummary: { income: number, expense: number, balance: number } | null;
  categories: string[];
  groupFilter: string;
  onGroupFilterChange: (groupId: string) => void;
  groupOptions: { id: string; name: string }[];
  
  showLinked: 'all' | 'linked' | 'unlinked';
  onShowLinkedChange: (value: 'all' | 'linked' | 'unlinked') => void;

  // --- ADDED ---
  recurringFilter: 'all' | 'recurring' | 'non_recurring';
  onRecurringFilterChange: (value: 'all' | 'recurring' | 'non_recurring') => void;
  // ---
}

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  type,
  onTypeChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  owner,
  onOwnerChange,
  owners,
  customers = [],
  selectedCustomerId,
  onCustomerChange,
  accountFilter,
  onAccountFilterChange,
  accounts,
  groupFilter,
  onGroupFilterChange,
  groupOptions,
  categories,
  showLinked,
  onShowLinkedChange,
  recurringFilter, // <-- ADDED
  onRecurringFilterChange, // <-- ADDED
}) => {
  const { formatCurrency } = useFormattedDisplay();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* From */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onDateRangeChange({
                ...dateRange,
                start: e.target.value ? new Date(e.target.value) : null,
              })
            }
            className="form-input mt-1 w-full"
          />
        </div>

        {/* To */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onDateRangeChange({
                ...dateRange,
                end: e.target.value ? new Date(e.target.value) : null,
              })
            }
            min={dateRange.start ? dateRange.start.toISOString().split('T')[0] : undefined}
            className="form-input mt-1 w-full"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Type</label>
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as typeof type)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Payment Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Categories</option>
            
            {categories.map((catName) => (
              <option key={catName} value={catName}>
                {catName}
              </option>
            ))}
          </select>
        </div>

        {/* Group */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Group</label>
          <select
            value={groupFilter}
            onChange={(e) => onGroupFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Groups</option>
            <option value="none">No Group Assigned</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Owner */}
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700">Owner</label>
          <select
            value={owner}
            onChange={(e) => onOwnerChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Owners</option>
            <option value="no_owner_assigned">No Vehicle Assigned</option>
            {owners.map((ownerName) => (
              <option key={ownerName} value={ownerName}>
                {ownerName}
              </option>
            ))}
          </select>
        </div>

        {/* Customer (optional) */}
        {onCustomerChange && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => onCustomerChange(e.target.value)}
              className="form-select mt-1 w-full"
            >
              <option value="">All Customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Account Filter */}
        <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Account</label>
            <select
                value={accountFilter}
                onChange={(e) => onAccountFilterChange(e.target.value)}
                className="form-select mt-1 w-full"
            >
                <option value="all">All Accounts</option>
                <option value="no_account_assigned">No Account Assigned</option>
                {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                        {acc.name}
                    </option>
                ))}
            </select>
        </div>

        {/* Linked Status Filter */}
        <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Linked Status</label>
            <select
                value={showLinked}
                onChange={(e) => onShowLinkedChange(e.target.value as 'all' | 'linked' | 'unlinked')}
                className="form-select mt-1 w-full"
            >
                <option value="all">All Transactions</option>
                <option value="linked">Show Linked Only</option>
                <option value="unlinked">Show Unlinked Only</option>
            </select>
        </div>

        {/* --- ADDED: Recurring Filter --- */}
        <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700">Recurring</label>
            <select
                value={recurringFilter}
                onChange={(e) => onRecurringFilterChange(e.target.value as 'all' | 'recurring' | 'non_recurring')}
                className="form-select mt-1 w-full"
            >
                <option value="all">All Transactions</option>
                <option value="recurring">Recurring Only</option>
                <option value="non_recurring">Non-Recurring Only</option>
            </select>
        </div>
        {/* --- End Update --- */}
      </div>
    </div>
  );
};

export default FinanceFilters;