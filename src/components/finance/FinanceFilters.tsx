// src/components/finance/FinanceFilters.tsx

import React from 'react';
import { Customer, Account } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface FinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;
  onStatusFilterChange: (status: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  accountFilter: string;
  onAccountFilterChange: (account: string) => void;
  accountFromFilter: string;
  onAccountFromFilterChange: (account: string) => void;
  accountToFilter: string;
  onAccountToFilterChange: (account: string) => void;
  accounts: Account[];
  owner: string;
  onOwnerChange: (owner: string) => void;
  owners: string[];
  customers?: Customer[];
  selectedCustomerId?: string;
  onCustomerChange?: (customerId: string) => void;
  accountSummary?: { income: number; expense: number; balance: number } | null;

  /** ── NEW: Finance-specific categories, as plain string names ── **/
  categories: string[];
}

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  type,
  onTypeChange,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  dateRange,
  onDateRangeChange,
  accountFilter,
  onAccountFilterChange,
  accountFromFilter,
  onAccountFromFilterChange,
  accountToFilter,
  onAccountToFilterChange,
  accounts,
  owner,
  onOwnerChange,
  owners,
  customers = [],
  selectedCustomerId,
  onCustomerChange,
  accountSummary,

  /** ── Receive finance page categories here ── **/
  categories,
}) => {
  const { formatCurrency } = useFormattedDisplay();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date “From” */}
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={dateRange.start ? dateRange.start.toISOString().split('T')[0] : ''}
            onChange={(e) =>
              onDateRangeChange({
                ...dateRange,
                start: e.target.value ? new Date(e.target.value) : null,
              })
            }
            className="form-input mt-1"
          />
        </div>

        {/* Date “To” */}
        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
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
            className="form-input mt-1"
          />
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as typeof type)}
            className="form-select mt-1"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="form-select mt-1"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>

        {/* ── Category Filter (dynamically from props) ── */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="form-select mt-1"
          >
            <option value="all">All Categories</option>
            {categories.map((catName) => (
              <option key={catName} value={catName}>
                {catName}
              </option>
            ))}
          </select>
        </div>

        {/* Account Filter (optional / can be ignored) */}
        <div>
          {/* <label className="block text-sm font-medium text-gray-700">Account</label>
          <select
            value={accountFilter}
            onChange={(e) => onAccountFilterChange(e.target.value)}
            className="form-select mt-1"
          >
            <option value="all">All Accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select> */}

          {/* {accountSummary && (
            <div className="mt-2 text-xs">
              <div className="text-green-600">In: {formatCurrency(accountSummary.income)}</div>
              <div className="text-red-600">Out: {formatCurrency(accountSummary.expense)}</div>
              <div className="font-medium">Balance: {formatCurrency(accountSummary.balance)}</div>
            </div>
          )} */}
        </div>

        {/* Owner Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Owner</label>
          <select
            value={owner}
            onChange={(e) => onOwnerChange(e.target.value)}
            className="form-select mt-1"
          >
            <option value="all">All Owners</option>
            {owners.map((ownerName) => (
              <option key={ownerName} value={ownerName}>
                {ownerName}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Filter (optional) */}
        {onCustomerChange && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => onCustomerChange(e.target.value)}
              className="form-select mt-1"
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
      </div>
    </div>
  );
};

export default FinanceFilters;
