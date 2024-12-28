// src/components/vehicles/VehicleFilters.tsx
import React from 'react';
import { Search } from 'lucide-react';

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
}

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
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by registration, make, model, VIN or owner..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
      >
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="maintenance">Maintenance</option>
        <option value="rented">Rented</option>
        <option value="claim">In Claim</option>
        <option value="unavailable">Unavailable</option>
        <option value="sold">Sold</option>
      </select>

      <select
        value={makeFilter}
        onChange={(e) => onMakeFilterChange(e.target.value)}
        className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
      >
        <option value="all">All Makes</option>
        {makes.map((make) => (
          <option key={make} value={make}>{make}</option>
        ))}
      </select>

      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={showSold}
          onChange={(e) => onShowSoldChange(e.target.checked)}
          className="rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm text-gray-700">Show Sold Vehicles</span>
      </label>
    </div>
  );
};

export default VehicleFilters;
