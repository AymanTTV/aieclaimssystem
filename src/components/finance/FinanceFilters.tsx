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

  // new props
  categories: string[];
  groupFilter: string;
  onGroupFilterChange: (groupId: string) => void;
  groupOptions: { id: string; name: string }[];
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
  groupFilter,
  onGroupFilterChange,
  groupOptions,
  categories
}) => {
  const { formatCurrency } = useFormattedDisplay();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Row 1, Col 1: From */}
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={
              dateRange.start
                ? dateRange.start.toISOString().split('T')[0]
                : ''
            }
            onChange={e =>
              onDateRangeChange({
                ...dateRange,
                start: e.target.value ? new Date(e.target.value) : null
              })
            }
            className="form-input mt-1 w-full"
          />
        </div>

        {/* Row 1, Col 2: To */}
        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={
              dateRange.end ? dateRange.end.toISOString().split('T')[0] : ''
            }
            onChange={e =>
              onDateRangeChange({
                ...dateRange,
                end: e.target.value ? new Date(e.target.value) : null
              })
            }
            min={
              dateRange.start
                ? dateRange.start.toISOString().split('T')[0]
                : undefined
            }
            className="form-input mt-1 w-full"
          />
        </div>

        {/* Row 1, Col 3: Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={type}
            onChange={e => onTypeChange(e.target.value as typeof type)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>

        {/* Row 1, Col 4: Payment Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Payment Status
          </label>
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>

        {/* Row 2, Col 1: Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            value={categoryFilter}
            onChange={e => onCategoryFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Categories</option>
            {categories.map(catName => (
              <option key={catName} value={catName}>
                {catName}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2, Col 2: Group */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Group
          </label>
          <select
            value={groupFilter}
            onChange={e => onGroupFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Groups</option>
            {groupOptions.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2, Col 3: Owner */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Owner</label>
          <select
            value={owner}
            onChange={e => onOwnerChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Owners</option>
            {owners.map(ownerName => (
              <option key={ownerName} value={ownerName}>
                {ownerName}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2, Col 4: Customer */}
        {onCustomerChange && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={e => onCustomerChange(e.target.value)}
              className="form-select mt-1 w-full"
            >
              <option value="">All Customers</option>
              {customers.map(customer => (
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
