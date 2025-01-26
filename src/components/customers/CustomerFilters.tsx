import React from 'react';
import { Search } from 'lucide-react';
import { Gender } from '../../types/customer';

interface CustomerFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterExpired: boolean;
  onFilterExpired: (filter: boolean) => void;
  filterSoonExpiring: boolean;
  onFilterSoonExpiring: (filter: boolean) => void;
  selectedGender: Gender | 'all';
  onGenderFilter: (gender: Gender | 'all') => void;
  ageRange: { min: number; max: number } | null;
  onAgeRangeFilter: (range: { min: number; max: number } | null) => void;
}

const CustomerFilters: React.FC<CustomerFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filterExpired,
  onFilterExpired,
  filterSoonExpiring,
  onFilterSoonExpiring,
  selectedGender,
  onGenderFilter,
  ageRange,
  onAgeRangeFilter,
}) => {
  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, email, phone, badge number..."
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-4">
        {/* Document Status Filters */}
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filterExpired}
              onChange={(e) => onFilterExpired(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Hide Expired Documents</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={filterSoonExpiring}
              onChange={(e) => onFilterSoonExpiring(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Show Soon Expiring</span>
          </label>
        </div>

        {/* Gender Filter */}
        <select
          value={selectedGender}
          onChange={(e) => onGenderFilter(e.target.value as Gender | 'all')}
          className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        >
          <option value="all">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        {/* Age Range Filter */}
        <div className="flex items-center space-x-2">
          <input
            type="number"
            placeholder="Min Age"
            value={ageRange?.min || ''}
            onChange={(e) => {
              const min = parseInt(e.target.value);
              onAgeRangeFilter(min ? { min, max: ageRange?.max || 100 } : null);
            }}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
          <span>-</span>
          <input
            type="number"
            placeholder="Max Age"
            value={ageRange?.max || ''}
            onChange={(e) => {
              const max = parseInt(e.target.value);
              onAgeRangeFilter(max ? { min: ageRange?.min || 0, max } : null);
            }}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
};

export default CustomerFilters;
