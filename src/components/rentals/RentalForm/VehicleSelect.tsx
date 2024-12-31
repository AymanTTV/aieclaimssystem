import React, { useState, useMemo } from 'react';
import { Vehicle } from '../../../types';
import { Search } from 'lucide-react';

interface VehicleSelectProps {
  vehicles: Vehicle[];
  selectedVehicleId: string;
  onSelect: (vehicleId: string) => void;
  disabled?: boolean;
  error?: string;
}

const VehicleSelect: React.FC<VehicleSelectProps> = ({
  vehicles,
  selectedVehicleId,
  onSelect,
  disabled = false,
  error
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter available vehicles and search
  const availableVehicles = useMemo(() => {
    return vehicles
      .filter(vehicle => 
        // Only show available vehicles
        vehicle.status === 'available' &&
        // Search by make, model, or registration
        (vehicle.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
         vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
         vehicle.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => a.make.localeCompare(b.make));
  }, [vehicles, searchQuery]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Vehicle
      </label>
      
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="Search vehicles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
        />
      </div>

      {/* Vehicle select */}
      <select
        value={selectedVehicleId}
        onChange={(e) => onSelect(e.target.value)}
        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${
          error ? 'border-red-300' : ''
        }`}
        disabled={disabled}
        required
      >
        <option value="">Select a vehicle</option>
        {availableVehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {availableVehicles.length === 0 && searchQuery && (
        <p className="text-sm text-gray-500">No vehicles found matching your search</p>
      )}

      {availableVehicles.length === 0 && !searchQuery && (
        <p className="text-sm text-gray-500">No available vehicles</p>
      )}
    </div>
  );
};

export default VehicleSelect;