// src/components/vehicles/VehicleFilters.tsx

import React, { useMemo } from 'react';
import { Search } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect'; 
import { usePermissions } from '../../hooks/usePermissions';

interface VehicleFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  makeFilter: string;
  onMakeFilterChange: (make: string) => void;
  makes: string[];
  showSold: boolean;
  onShowSoldChange: (show: boolean) => void;
  showDueSoon: boolean;
  onShowDueSoonChange: (show: boolean) => void;
  
  expiryFilter: string;
  onExpiryFilterChange: (value: string) => void;

  // NEW PROPS
  accountFilter: string;
  onAccountFilterChange: (value: string) => void;
  accounts: { id: string; name: string }[];
}

const EXPIRY_OPTIONS = [
  { id: 'mot', label: 'MOT Expiry' },
  { id: 'nsl', label: 'NSL Expiry' },
  { id: 'tax', label: 'Road Tax Expiry' },
  { id: 'insurance', label: 'Insurance Expiry' },
  { id: 'maintenance', label: 'Near Maintenance (Date/1k mi)' },
  { id: 'service_soon', label: 'Service Due Soon (< 5,000 mi)' }, 
  { id: 'needs_update', label: 'Monthly Update Needed (28th)' }, // UPDATED LABEL
];

const VehicleFilters: React.FC<VehicleFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  makeFilter,
  onMakeFilterChange,
  makes,
  showSold,
  onShowSoldChange,
  showDueSoon,
  onShowDueSoonChange,
  expiryFilter,
  onExpiryFilterChange,
  accountFilter,
  onAccountFilterChange,
  accounts,
}) => {
  const { isCompany } = usePermissions(); // ✅ Get the isCompany flag

  const accountOptions = useMemo(() => [
    { id: 'all', label: 'All Accounts' },
    { id: 'no_account_assigned', label: 'No Account Assigned' },
    ...accounts.map((acc) => ({ id: acc.id, label: acc.name }))
  ], [accounts]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
      {/* Search */}
      <div className="relative col-span-1 sm:col-span-2 lg:col-span-2">
         <label className="block text-sm font-medium text-gray-700 mb-1">
          Search
        </label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search vehicles (reg, make, model, owner, account)..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
        </div>
      </div>

      {/* Account Filter (NEW) - ✅ Hidden for Company */}
      {!isCompany && (
        <div className="relative">
           <SearchableSelect
              label="Account"
              options={accountOptions}
              value={accountFilter}
              onChange={onAccountFilterChange}
              placeholder="Select account..."
              isClearable={false}
           />
        </div>
      )}

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="hired">Hired</option>
            <option value="scheduled-rental">Scheduled for Hire</option>
            <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {/* Make */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Make
        </label>
        <select
            value={makeFilter}
            onChange={(e) => onMakeFilterChange(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
            <option value="all">All Makes</option>
            {makes.map((make) => (
            <option key={make} value={make}>{make}</option>
            ))}
        </select>
      </div>
      
      {/* Expiring or Expired Filter */}
      <div className="relative">
        <SearchableSelect
          label="Expiring or Expired"
          options={EXPIRY_OPTIONS}
          value={expiryFilter}
          onChange={onExpiryFilterChange}
          placeholder="Select expiry type..."
          isClearable={true} 
        />
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-3 pt-2">
        {/* ✅ Hidden for Company */}
        {!isCompany && (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showSold}
              onChange={(e) => onShowSoldChange(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Show Sold</span>
          </label>
        )}

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showDueSoon}
            onChange={(e) => onShowDueSoonChange(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Due Soon (Quick View)</span>
        </label>
      </div>
    </div>
  );
};

export default VehicleFilters;