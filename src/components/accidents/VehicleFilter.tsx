import React from 'react';
import { Vehicle } from '../../types';
import Card from '../Card';

interface VehicleFilterProps {
  vehicles: Vehicle[];
  selectedVehicle: string | null;
  onVehicleSelect: (vehicleId: string | null) => void;
}

const VehicleFilter: React.FC<VehicleFilterProps> = ({ 
  vehicles, 
  selectedVehicle, 
  onVehicleSelect 
}) => {
  return (
    <Card title="Filter by Vehicle">
      <div className="space-y-2">
        <button
          onClick={() => onVehicleSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm ${
            !selectedVehicle
              ? 'bg-primary text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          All Vehicles
        </button>
        {vehicles.map(vehicle => (
          <button
            key={vehicle.id}
            onClick={() => onVehicleSelect(vehicle.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm ${
              selectedVehicle === vehicle.id
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
          </button>
        ))}
      </div>
    </Card>
  );
};

export default VehicleFilter;