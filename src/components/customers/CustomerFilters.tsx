// src/components/customers/CustomerFilters.tsx
import React from 'react';
import { Search } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect';
import { Gender, CustomerType } from '../../types/customer';

interface CustomerFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  
  expiryFilters: string[];
  onExpiryFiltersChange: (filters: string[]) => void;
  
  statusFilter: 'active' | 'inactive' | 'all';
  onStatusFilterChange: (status: 'active' | 'inactive' | 'all') => void;

  // [NEW] Bill Copy props
  billCopyFilter: 'available' | 'unavailable' | 'all';
  onBillCopyFilterChange: (status: 'available' | 'unavailable' | 'all') => void;

  selectedGender: Gender | 'all';
  onGenderFilter: (gender: Gender | 'all') => void;
  
  ageRange: { min: number; max: number } | null;
  onAgeRangeFilter: (range: { min: number; max: number } | null) => void;
  
  selectedType: CustomerType | 'all';
  onTypeFilter: (type: CustomerType | 'all') => void;
}

const EXPIRY_OPTIONS = [
  { id: 'all', label: 'All Document Statuses' },
  { id: 'already_expired', label: 'Already Expired' },
  { id: 'hide_expired', label: 'Hide Expired Documents' },
  { id: 'soon_all', label: 'Soon Expiring (Both in 2 wks)' },
  { id: 'soon_license', label: 'Soon Expiring License (2 wks)' },
  { id: 'soon_bill', label: 'Soon Expiring Bill (2 wks)' },
];

const STATUS_OPTIONS = [
  { id: 'active', label: 'Active Only' },
  { id: 'inactive', label: 'Inactive Only' },
  { id: 'all', label: 'All Statuses' },
];

// [NEW] Bill copy options
const BILL_COPY_OPTIONS = [
  { id: 'all', label: 'All Bill Copy Status' },
  { id: 'available', label: 'Available (In Office)' },
  { id: 'unavailable', label: 'Unavailable (Not in Office)' },
];

const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  searchQuery, onSearchChange,
  expiryFilters, onExpiryFiltersChange,
  statusFilter, onStatusFilterChange,
  billCopyFilter, onBillCopyFilterChange, // [NEW]
  selectedGender, onGenderFilter,
  ageRange, onAgeRangeFilter,
  selectedType, onTypeFilter,
}) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, email, phone, badge no, account no..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        
        <div className="w-48">
          <SearchableSelect
            label="Customer Status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(val) => onStatusFilterChange(val as any)}
          />
        </div>

        <div className="w-64">
          <SearchableSelect
            label="Document Expiry"
            options={EXPIRY_OPTIONS}
            value={expiryFilters}
            onChange={(val) => onExpiryFiltersChange(val as string[])}
            isMulti
            isClearable
          />
        </div>

        {/* [NEW] Bill Copy Select */}
        <div className="w-56">
          <SearchableSelect
            label="Office Bill Copy"
            options={BILL_COPY_OPTIONS}
            value={billCopyFilter}
            onChange={(val) => onBillCopyFilterChange(val as any)}
          />
        </div>

        <div className="w-32">
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={selectedType} onChange={(e) => onTypeFilter(e.target.value as CustomerType | 'all')} className="block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md text-sm">
            <option value="all">All</option>
            <option value="customer">Customer</option>
            <option value="claim">Claim</option>
            <option value="company">Company</option>
          </select>
        </div>

        <div className="w-32">
           <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select value={selectedGender} onChange={(e) => onGenderFilter(e.target.value as Gender | 'all')} className="block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md text-sm">
            <option value="all">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age Range</label>
          <div className="flex items-center space-x-2">
            <input type="number" placeholder="Min" value={ageRange?.min || ''} onChange={(e) => { const min = parseInt(e.target.value); onAgeRangeFilter(min ? { min, max: ageRange?.max || 100 } : null); }} className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm" />
            <span className="text-gray-400">-</span>
            <input type="number" placeholder="Max" value={ageRange?.max || ''} onChange={(e) => { const max = parseInt(e.target.value); onAgeRangeFilter(max ? { min: ageRange?.min || 0, max } : null); }} className="w-20 px-2 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerFilters;