import React from 'react';
import { Accident, Vehicle, User } from '../types';
import StatusBadge from './StatusBadge';
import { format } from 'date-fns';
import { AlertTriangle, MapPin, User as UserIcon, DollarSign } from 'lucide-react';

interface AccidentCardProps {
  accident: Accident;
  vehicle: Vehicle;
  driver: User;
}

const AccidentCard: React.FC<AccidentCardProps> = ({ accident, vehicle, driver }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {vehicle.make} {vehicle.model}
            </h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {vehicle.registrationNumber}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <StatusBadge status={accident.status} />
          {accident.claimStatus && <StatusBadge status={accident.claimStatus} />}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center text-sm">
          <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
          <span>{driver.name}</span>
        </div>

        <div className="flex items-center text-sm">
          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
          <span>{accident.location}</span>
        </div>

        {accident.claimAmount && (
          <div className="flex items-center text-sm">
            <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
            <span>${accident.claimAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="mt-2">
          <p className="text-sm text-gray-600">{accident.description}</p>
        </div>

        {accident.images && accident.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {accident.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Accident photo ${index + 1}`}
                className="w-full h-32 object-cover rounded-md"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccidentCard;