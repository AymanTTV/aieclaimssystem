import React from 'react';
import { Search } from 'lucide-react';

interface FinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  startDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  endDate: Date | null;
  onEndDateChange: (date: Date | null) => void;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;
  category: string;
  onCategoryChange: (category: string) => void;
  paymentStatus: 'all' | 'paid' | 'unpaid' | 'partially_paid';
  onPaymentStatusChange: (status: 'all' | 'paid' | 'unpaid' | 'partially_paid') => void;
  owner: string;
  onOwnerChange: (owner: string) => void;
  owners: string[];
}

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  type,
  onTypeChange,
  category,
  onCategoryChange,
  paymentStatus,
  onPaymentStatusChange,
  owner,
  onOwnerChange,
  owners
}) => {
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search transactions..."
          className="form-input pl-10 w-full"
        />
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => onStartDateChange(e.target.value ? new Date(e.target.value) : null)}
            className="form-input mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => onEndDateChange(e.target.value ? new Date(e.target.value) : null)}
            min={startDate ? startDate.toISOString().split('T')[0] : undefined}
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

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="form-select mt-1"
          >
            <option value="all">All Categories</option>
            <option value="rental">Rental</option>
            <option value="maintenance">Maintenance</option>
            <option value="insurance">Insurance</option>
            <option value="tax">Tax</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Payment Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Status</label>
          <select
            value={paymentStatus}
            onChange={(e) => onPaymentStatusChange(e.target.value as typeof paymentStatus)}
            className="form-select mt-1"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
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
            <option value="company">AIE Skyline</option>
            {owners.map((ownerName) => (
              <option key={ownerName} value={ownerName}>{ownerName}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FinanceFilters;