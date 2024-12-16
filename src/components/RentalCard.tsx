import React from 'react';
import { Rental, Vehicle, User } from '../types';
import StatusBadge from './StatusBadge';
import { format } from 'date-fns';
import { Calendar, DollarSign, User as UserIcon } from 'lucide-react';

interface RentalCardProps {
  rental: Rental;
  vehicle: Vehicle;
  renter?: User | null;
}

const RentalCard: React.FC<RentalCardProps> = ({ rental, vehicle, renter }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {vehicle.make} {vehicle.model}
            </h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {vehicle.registrationNumber}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <StatusBadge status={rental.status} />
          <StatusBadge status={rental.paymentStatus} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center text-sm">
          <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
          <span>{renter?.name || 'Loading...'}</span>
        </div>

        <div className="flex items-center text-sm">
          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
          <span>
            {format(rental.startDate, 'MMM dd, yyyy')} - {format(rental.endDate, 'MMM dd, yyyy')}
          </span>
        </div>

        <div className="flex items-center text-sm">
          <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
          <span>${rental.cost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default RentalCard;