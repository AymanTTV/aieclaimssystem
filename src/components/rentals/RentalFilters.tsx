import React from 'react';
import { Search } from 'lucide-react';
import { Vehicle } from '../../types';

interface RentalFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  vehicleFilter: string;
  onVehicleFilterChange: (vehicleId: string) => void;
  vehicles: Vehicle[];
}

const RentalFilters: React.FC<RentalFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  vehicleFilter,
  onVehicleFilterChange,
  vehicles,
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
          placeholder="Search rentals..."
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
      >
        <option value="all">All Status</option>
        <option value="scheduled">Scheduled</option>
        <option value="active">Hired</option>
        
        <option value="completed">Completed</option>
        
        
      </select>

      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
        className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
      >
        <option value="all">All Types</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="claim">Claim</option>
      </select>

      <select
        value={vehicleFilter}
        onChange={(e) => onVehicleFilterChange(e.target.value)}
        className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
      >
        <option value="">All Vehicles</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
          </option>
        ))}
      </select>
    </div>
  );
};

export default RentalFilters;