import React from 'react';
import { Vehicle } from '../types';

interface VehicleSelectProps {
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelect: (vehicleId: string) => void;
  className?: string;
  required?: boolean;
}

const VehicleSelect: React.FC<VehicleSelectProps> = ({
  vehicles,
  selectedVehicleId,
  onSelect,
  className = '',
  required = true,
}) => {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Select Vehicle
      </label>
      <select
        value={selectedVehicleId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm ${className}`}
        required={required}
      >
        <option value="">Select a vehicle</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VehicleSelect;