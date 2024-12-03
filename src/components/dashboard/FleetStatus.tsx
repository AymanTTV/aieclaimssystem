import React from 'react';
import { Car } from 'lucide-react';
import Card from '../Card';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  registrationNumber: string;
  status: 'active' | 'maintenance' | 'unavailable';
}

interface FleetStatusProps {
  vehicles: Vehicle[];
}

const FleetStatus: React.FC<FleetStatusProps> = ({ vehicles }) => {
  const getStatusColor = (status: Vehicle['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card title="Fleet Status">
      <div className="space-y-4">
        {vehicles.map(vehicle => (
          <div key={vehicle.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Car className="w-5 h-5 text-primary mt-1" />
              <div>
                <p className="font-medium text-gray-900">
                  {vehicle.make} {vehicle.model}
                </p>
                <p className="text-sm text-gray-500">
                  {vehicle.registrationNumber}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(vehicle.status)}`}>
              {vehicle.status}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default FleetStatus;