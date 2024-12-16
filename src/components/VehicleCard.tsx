import React from 'react';
import { Vehicle } from '../types';
import StatusBadge from './StatusBadge';
import { format } from 'date-fns';
import { Car, Edit, Trash2 } from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick?: () => void;
  onDelete?: () => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onClick, onDelete }) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow relative group"
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDelete}
          className="p-1 text-red-600 hover:bg-red-50 rounded-full"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center">
          {vehicle.image ? (
            <img
              src={vehicle.image}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-16 h-16 object-cover rounded-md mr-3"
            />
          ) : (
            <Car className="w-8 h-8 text-primary mr-3" />
          )}
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