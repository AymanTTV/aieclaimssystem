// src/components/rentals/RentalForm/VehicleSelect.tsx
import React, { useState, useMemo } from 'react';
import { Vehicle } from '../../../types';
import { Search } from 'lucide-react';
import { useAvailableVehicles } from '../../../hooks/useAvailableVehicles';

interface VehicleSelectProps {
  vehicles: Vehicle[];
  selectedVehicleId: string;
  onSelect: (vehicleId: string) => void;
  startDate?: Date;
  endDate?: Date;
  disabled?: boolean;
  error?: string;
}

const VehicleSelect: React.FC<VehicleSelectProps> = ({
  vehicles,
  selectedVehicleId,
  onSelect,
  startDate,
  endDate,
  disabled = false,
  error
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { availableVehicles, loading } = useAvailableVehicles(vehicles, startDate, endDate);

  // Filter available vehicles by search query
  const filteredVehicles = useMemo(() => {
    return availableVehicles.filter(vehicle => {
      const searchLower = searchQuery.toLowerCase();
      return (
        vehicle.make.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        vehicle.registrationNumber.toLowerCase().includes(searchLower)
      );
    });
  }, [availableVehicles, searchQuery]);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Select Vehicle
      </label>
      
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
        {filteredVehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
            {vehicle.weeklyRentalPrice && ` (£${vehicle.weeklyRentalPrice}/week)`}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {filteredVehicles.length === 0 && searchQuery && (
        <p className="text-sm text-gray-500">No available vehicles found matching your search</p>
      )}

      {filteredVehicles.length === 0 && !searchQuery && (
        <p className="text-sm text-gray-500">No vehicles available for the selected dates</p>
      )}
    </div>
  );
};

export default VehicleSelect;
