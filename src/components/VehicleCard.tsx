import React from 'react';
import { Vehicle } from '../types';
import StatusBadge from './StatusBadge';
import { format } from 'date-fns';
import { Car } from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <Car className="w-8 h-8 text-primary mr-3" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {vehicle.make} {vehicle.model}
            </h3>
            <p className="text-sm text-gray-500">
              {vehicle.year} • {vehicle.registrationNumber}
            </p>
          </div>
        </div>
        <StatusBadge status={vehicle.status} />
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Mileage</p>
          <p className="font-medium">{vehicle.mileage.toLocaleString()} km</p>
        </div>
        <div>
          <p className="text-gray-500">Insurance Expires</p>
          <p className="font-medium">{format(vehicle.insuranceExpiry, 'MMM dd, yyyy')}</p>
        </div>
        <div>
          <p className="text-gray-500">Last Maintenance</p>
          <p className="font-medium">{format(vehicle.lastMaintenance, 'MMM dd, yyyy')}</p>
        </div>
        <div>
          <p className="text-gray-500">Next Service</p>
          <p className="font-medium">{format(vehicle.nextMaintenance, 'MMM dd, yyyy')}</p>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;