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
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs p-4 sm:p-5 text-[#0F172A] space-y-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, email, phone, badge no, account no..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl leading-5 bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-xs"
        />
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-48">
          <SearchableSelect
            label="Customer Status"
            labelClassName="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(val) => onStatusFilterChange(val as any)}
          />
        </div>

        <div className="w-64">
          <SearchableSelect
            label="Document Expiry"
            labelClassName="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5"
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
            labelClassName="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5"
            options={BILL_COPY_OPTIONS}
            value={billCopyFilter}
            onChange={(val) => onBillCopyFilterChange(val as any)}
          />
        </div>

        <div className="w-32">
          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Type</label>
          <select
            value={selectedType}
            onChange={(e) => onTypeFilter(e.target.value as CustomerType | 'all')}
            className="block w-full px-3 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
          >
            <option value="all">All</option>
            <option value="customer">Customer</option>
            <option value="claim">Claim</option>
            <option value="company">Company</option>
          </select>
        </div>

        <div className="w-32">
          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Gender</label>
          <select
            value={selectedGender}
            onChange={(e) => onGenderFilter(e.target.value as Gender | 'all')}
            className="block w-full px-3 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
          >
            <option value="all">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#64748B] uppercase tracking-wider mb-1.5">Age Range</label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              placeholder="Min"
              value={ageRange?.min || ''}
              onChange={(e) => { const min = parseInt(e.target.value); onAgeRangeFilter(min ? { min, max: ageRange?.max || 100 } : null); }}
              className="w-20 px-2.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
            />
            <span className="text-[#94A3B8]">-</span>
            <input
              type="number"
              placeholder="Max"
              value={ageRange?.max || ''}
              onChange={(e) => { const max = parseInt(e.target.value); onAgeRangeFilter(max ? { min: ageRange?.min || 0, max } : null); }}
              className="w-20 px-2.5 py-2.5 border-[1.5px] border-[#CBD5E1] rounded-xl bg-white text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerFilters;