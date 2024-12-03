import React from 'react';
import { Vehicle } from '../../types';
import { format, isBefore, addDays } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface InsuranceExpiryListProps {
  vehicles: Vehicle[];
}

const InsuranceExpiryList: React.FC<InsuranceExpiryListProps> = ({ vehicles }) => {
  const sortedVehicles = [...vehicles]
    .filter(v => isBefore(new Date(), addDays(v.insuranceExpiry, 30)))
    .sort((a, b) => a.insuranceExpiry.getTime() - b.insuranceExpiry.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {sortedVehicles.map(vehicle => (
        <div key={vehicle.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className={`w-5 h-5 ${
              isBefore(vehicle.insuranceExpiry, new Date()) 
                ? 'text-red-500' 
                : 'text-yellow-500'
            } mr-3`} />
            <div>
              <p className="font-medium">
                {vehicle.make} {vehicle.model}
              </p>
              <p className="text-sm text-gray-500">
                {vehicle.registrationNumber}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">Expires</p>
            <p className="text-sm text-gray-500">
              {format(vehicle.insuranceExpiry, 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InsuranceExpiryList;