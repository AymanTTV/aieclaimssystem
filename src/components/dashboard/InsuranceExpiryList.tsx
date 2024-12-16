import React from 'react';
import { Vehicle } from '../../types';
import { format, isBefore, addDays } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface InsuranceExpiryListProps {
  vehicles: Vehicle[];
}

const InsuranceExpiryList: React.FC<InsuranceExpiryListProps> = ({ vehicles }) => {
  const upcomingExpirations = vehicles
    .filter(v => isBefore(new Date(), addDays(v.insuranceExpiry, 30)))
    .sort((a, b) => a.insuranceExpiry.getTime() - b.insuranceExpiry.getTime())
    .slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Insurance Expiry Alerts</h3>
      <div className="space-y-4">
        {upcomingExpirations.map(vehicle => (
          <div key={vehicle.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="font-medium text-gray-900">
                  {vehicle.make} {vehicle.model}
                </p>
                <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Expires</p>
              <p className="text-sm text-gray-500">
                {format(vehicle.insuranceExpiry, 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
        ))}
        {upcomingExpirations.length === 0 && (
          <p className="text-center text-gray-500 py-4">No upcoming insurance expirations</p>
        )}
      </div>
    </div>
  );
};

export default InsuranceExpiryList;