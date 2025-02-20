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
  paymentStatus: 'all' | 'pending' | 'completed';
  onPaymentStatusChange: (status: 'all' | 'pending' | 'completed') => void;
  vehicleRegistration: string;
  onVehicleRegistrationChange: (registration: string) => void;
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
  owners,
  vehicleRegistration,
  onVehicleRegistrationChange
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
    placeholder="Search by description, category, vehicle registration..."
    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
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
            {Object.entries(allCategories).map(([type, categories]) => (
              <optgroup key={type} label={type === 'income' ? 'Income' : 'Expense'}> {/* Group by Income/Expense */}
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </optgroup>
            ))}
             <option value="other">Other</option> {/* Keep "Other" option for custom categories */}

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
      </div>
    </div>
  );
};

export default FinanceFilters;