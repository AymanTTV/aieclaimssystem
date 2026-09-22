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
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  expiryFilter: string;
  onExpiryFilterChange: (value: string) => void;

  ageFilter: string;                           
  onAgeFilterChange: (value: string) => void;  

  accountFilter: string;
  onAccountFilterChange: (value: string) => void;
  accounts: { id: string; name: string }[];
  
  garageFilter: string;
  onGarageFilterChange: (value: string) => void;
  garages: { id: string; name: string }[];

  groupFilter: string;
  onGroupFilterChange: (value: string) => void;
  groups: { id: string; name: string }[];

  // ✅ NEW Department Props
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  departments: { id: string; name: string }[];

  ownerFilter: string;
  onOwnerFilterChange: (value: string) => void;
  owners: string[];
}

const EXPIRY_OPTIONS = [
  { id: 'mot', label: 'MOT Expiry' },
  { id: 'nsl', label: 'NSL Expiry' },
  { id: 'tax', label: 'Road Tax Expiry' },
  { id: 'insurance', label: 'Insurance Expiry' },
  { id: 'maintenance', label: 'Near Maintenance (Date/1k mi)' },
  { id: 'service_soon', label: 'Service Due Soon (< 5,000 mi)' }, 
  { id: 'needs_update', label: 'Monthly Update Needed (28th)' }, 
  { id: 'warranty', label: 'Warranty Expiry' }, 
];

const VehicleFilters: React.FC<VehicleFiltersProps> = ({
  searchQuery, onSearchChange,
  statusFilter, onStatusFilterChange,
  makeFilter, onMakeFilterChange, makes,
  showSold, onShowSoldChange,
  showDueSoon, onShowDueSoonChange,
  expiryFilter, onExpiryFilterChange,
  accountFilter, onAccountFilterChange, accounts,
  garageFilter, onGarageFilterChange, garages,
  typeFilter, onTypeFilterChange,
  ageFilter, onAgeFilterChange,
  groupFilter, onGroupFilterChange, groups, 
  departmentFilter, onDepartmentFilterChange, departments, // ✅ Extract Dept Props
  ownerFilter, onOwnerFilterChange, owners 
}) => {
  const { isCompany } = usePermissions(); 

  const accountOptions = useMemo(() => [
    { id: 'all', label: 'All Accounts' },
    { id: 'no_account_assigned', label: 'No Account Assigned' },
    ...accounts.map((acc) => ({ id: acc.id, label: acc.name }))
  ], [accounts]);

  const garageOptions = useMemo(() => [
    { id: 'all', label: 'All Garages / Companies' },
    { id: 'no_garage_assigned', label: 'No Garage Assigned' },
    ...garages.map((g) => ({ id: g.id, label: g.name }))
  ], [garages]);

  const groupOptions = useMemo(() => [
    { id: 'all', label: 'All Finance Groups' },
    { id: 'no_group_assigned', label: 'No Group Assigned' },
    ...groups.map((g) => ({ id: g.id, label: g.name }))
  ], [groups]);

  // ✅ Department Options mapping
  const departmentOptions = useMemo(() => [
    { id: 'all', label: 'All Departments' },
    { id: 'no_department_assigned', label: 'No Department Assigned' },
    ...departments.map((d) => ({ id: d.id, label: d.name }))
  ], [departments]);

  const ownerOptions = useMemo(() => [
    { id: 'all', label: 'All Owners' },
    { id: 'AIE Skyline (Default)', label: 'AIE Skyline (Default)' },
    ...owners.filter(o => o !== 'AIE Skyline').map((o) => ({ id: o, label: o }))
  ], [owners]);

  return (
    <div className="bg-[#16192B] border border-[#2B314E] rounded-2xl shadow-xl p-4 sm:p-5 text-white space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-end">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2 lg:col-span-2">
          <label className="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider">Search</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search vehicles (reg, make, owner, account, garage, group, dept)..."
              className="block w-full pl-10 pr-3.5 py-2.5 border border-[#2B314E] rounded-xl leading-5 bg-[#0F111A] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all shadow-inner"
            />
          </div>
        </div>

        {!isCompany && (
          <div className="relative">
            <SearchableSelect
              label="Account"
              options={accountOptions}
              value={accountFilter}
              onChange={onAccountFilterChange}
              placeholder="Select account..."
              isClearable={false}
              labelClassName="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider"
            />
          </div>
        )}

        {!isCompany && (
          <div className="relative">
            <SearchableSelect
              label="Garage / Company"
              options={garageOptions}
              value={garageFilter}
              onChange={onGarageFilterChange}
              placeholder="Select garage..."
              isClearable={false}
              labelClassName="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider"
            />
          </div>
        )}

        {!isCompany && (
          <div className="relative">
            <SearchableSelect
              label="Finance Group"
              options={groupOptions}
              value={groupFilter}
              onChange={onGroupFilterChange}
              placeholder="Select group..."
              isClearable={false}
              labelClassName="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider"
            />
          </div>
        )}

        {/* ✅ Department Filter */}
        {!isCompany && (
          <div className="relative">
            <SearchableSelect
              label="Department"
              options={departmentOptions}
              value={departmentFilter}
              onChange={onDepartmentFilterChange}
              placeholder="Select department..."
              isClearable={false}
              labelClassName="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider"
            />
          </div>
        )}

        {!isCompany && (
          <div className="relative">
            <SearchableSelect
              label="Owner"
              options={ownerOptions}
              value={ownerFilter}
              onChange={onOwnerFilterChange}
              placeholder="Select owner..."
              isClearable={false}
              labelClassName="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="block w-full px-3 py-2.5 text-sm bg-[#0F111A] border border-[#2B314E] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
          >
            <option value="all" className="bg-[#16192B] text-white">All Status</option>
            <option value="available" className="bg-[#16192B] text-white">Available</option>
            <option value="hired" className="bg-[#16192B] text-white">Hired</option>
            <option value="scheduled-rental" className="bg-[#16192B] text-white">Scheduled for Hire</option>
            <option value="maintenance" className="bg-[#16192B] text-white">Maintenance</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider">Make</label>
          <select
            value={makeFilter}
            onChange={(e) => onMakeFilterChange(e.target.value)}
            className="block w-full px-3 py-2.5 text-sm bg-[#0F111A] border border-[#2B314E] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
          >
            <option value="all" className="bg-[#16192B] text-white">All Makes</option>
            {makes.map((make) => (
              <option key={make} value={make} className="bg-[#16192B] text-white">{make}</option>
            ))}
          </select>
        </div>
        
        <div className="relative">
          <SearchableSelect
            label="Expiring or Expired"
            options={EXPIRY_OPTIONS}
            value={expiryFilter}
            onChange={onExpiryFilterChange}
            placeholder="Select expiry type..."
            isClearable={true}
            labelClassName="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider">Vehicle Type</label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="block w-full px-3 py-2.5 text-sm bg-[#0F111A] border border-[#2B314E] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
          >
            <option value="all" className="bg-[#16192B] text-white">All Types</option>
            <option value="Claims" className="bg-[#16192B] text-white">For Claims</option>
            <option value="Hire" className="bg-[#16192B] text-white">For Hire</option>
            <option value="unassigned" className="bg-[#16192B] text-white">Unassigned</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-white mb-1.5 uppercase tracking-wider">Vehicle Age</label>
          <select
            value={ageFilter}
            onChange={(e) => onAgeFilterChange(e.target.value)}
            className="block w-full px-3 py-2.5 text-sm bg-[#0F111A] border border-[#2B314E] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
          >
            <option value="all" className="bg-[#16192B] text-white">All Ages</option>
            <option value="0-5" className="bg-[#16192B] text-white">0 - 5 Years</option>
            <option value="6-10" className="bg-[#16192B] text-white">6 - 10 Years</option>
            <option value="11-20" className="bg-[#16192B] text-white">11 - 20 Years</option>
            <option value="21-40" className="bg-[#16192B] text-white">21 - 40 Years</option>
            <option value="41+" className="bg-[#16192B] text-white">41+ Years</option>
          </select>
        </div>

        <div className="flex items-center gap-5 sm:col-span-2 lg:col-span-3 pt-2">
          {!isCompany && (
            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSold}
                onChange={(e) => onShowSoldChange(e.target.checked)}
                className="h-4 w-4 rounded border-[#2B314E] bg-[#0F111A] text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Show Sold</span>
            </label>
          )}

          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDueSoon}
              onChange={(e) => onShowDueSoonChange(e.target.checked)}
              className="h-4 w-4 rounded border-[#2B314E] bg-[#0F111A] text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Due Soon (Quick View)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default VehicleFilters;