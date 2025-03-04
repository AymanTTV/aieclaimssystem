import React from 'react';
import { Search } from 'lucide-react';

interface FinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  startDate: Date | null;
  endDate: Date | null;
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;
  category: string;
  onCategoryChange: (category: string) => void;
  paymentStatus: 'all' | 'pending' | 'completed';
  onPaymentStatusChange: (status: 'all' | 'pending' | 'completed') => void;
  owner: string;
  onOwnerChange: (owner: string) => void;
  owners: string[];
  customers: { id: string; name: string }[];
  selectedCustomerId: string;
  onCustomerChange: (customerId: string) => void;
}

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  startDate,
  endDate,
  setDateRange,
  type,
  onTypeChange,
  category,
  onCategoryChange,
  paymentStatus,
  onPaymentStatusChange,
  owner,
  onOwnerChange,
  owners,
  customers,
  selectedCustomerId,
  onCustomerChange,
}) => {
  const allCategories = {
    income: [
      'Rental',
      'Maintenance Income',
      'Refunded Income',
      'Insurance Income',
      'Advertising Income',
      'VD Payment Income',
      'WINDSCREEN REPLACEMENT',
      'VD SPLIT JAY',
      'VD SPLIT AIE',
      'Road Tax Refund Income',
      'Commission Income',
      'Investment Income',
      'Loan Repayments Income',
      'AIE Claims VD Income',
      'AIE Claims Hire Income',
      'AIE Claims PI Income',
      'AIE Claims Domestic Income',
      'AIE Claims PH Income',
      'Skyline Cabs Commission Income',
    ],
    expense: [
      'Vehicle Insurance',
      'Road Tax',
      'VAT Referral',
      'MOT',
      'Fuel',
      'WINDSCREEN REPLACEMENT',
      'VD SPLIT JAY',
      'VD SPLIT AIE',
      'CLIENT VD PAID',
      'CLEINT REFERRAL FEE',
      'VD REPAIRE',
      'Vehicle Finance (Loan or Lease Payments)',
      'Maintenance',
      'Registration Fee',
      'NSL',
      'Repair',
      'Parts',
      'Cleaning',
      'Breakdown Cover',
      'Tyres & Wheel Alignment',
      'Toll Charges & Congestion Fees',
      'Parking Fees (PCN)',
      'Fleet Management Software',
      'Telematics & Tracking System',
      'Vehicle Depreciation',
      'Replacement Vehicle Costs',
      'Taxi Meter',
      'CCTV Installation & Monitoring',
      'Office Rent',
      'Phone & Internet Bill',
      'Office Stationery & Supplies',
      'Staff Salaries & Wages',
      'Staff Travel Expenses',
      'IT & Software Expenses',
      'Bank Fees & Transaction Charges',
      'Loan Repayments & Interest',
      'Advertising & Marketing',
      'Legal & Compliance Fees',
      'Training & Certification for Staff',
      'Call Centre & Customer Support Costs',
    ],
  };

  const handleStartDateChange = (dateString: string) => {
    const newStartDate = dateString ? new Date(dateString) : null;
    setDateRange({ start: newStartDate, end: endDate });
  };

  const handleEndDateChange = (dateString: string) => {
    const newEndDate = dateString ? new Date(dateString) : null;
    setDateRange({ start: startDate, end: newEndDate });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            value={startDate ? startDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleStartDateChange(e.target.value)}
            className="form-input mt-1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            value={endDate ? endDate.toISOString().split('T')[0] : ''}
            onChange={(e) => handleEndDateChange(e.target.value)}
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
            {Object.entries(allCategories).map(([type, categories]) => (
              <optgroup key={type} label={type === 'income' ? 'Income' : 'Expense'}>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </optgroup>
            ))}
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
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
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
        {/* Customer Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Customer</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => onCustomerChange(e.target.value)}
            className="form-select mt-1"
          >
            <option value="">All Customers</option>
            {customers && customers.map((customer) => ( // Check if customers exists before mapping.
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default FinanceFilters;