import React from 'react';
import { Vehicle } from '../../types';
import { format, isBefore, addDays } from 'date-fns';
import { Car, AlertTriangle, Calendar } from 'lucide-react';
import Card from '../Card';

interface VehicleReportProps {
  vehicles: Vehicle[];
}

const VehicleReport: React.FC<VehicleReportProps> = ({ vehicles }) => {
  const upcomingMaintenance = vehicles
    .filter(v => isBefore(new Date(), addDays(v.nextMaintenance, 30)))
    .sort((a, b) => a.nextMaintenance.getTime() - b.nextMaintenance.getTime())
    .slice(0, 3);

  const highMileageVehicles = [...vehicles]
    .sort((a, b) => b.mileage - a.mileage)
    .slice(0, 3);

  return (
    <Card title="Vehicle Reports">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Upcoming Maintenance</h3>
          <div className="space-y-3">
            {upcomingMaintenance.map(vehicle => (
              <div key={vehicle.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-primary mr-3" />
                  <div>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Next Service</p>
                  <p className="text-sm text-gray-500">
                    {format(vehicle.nextMaintenance, 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">High Mileage Vehicles</h3>
          <div className="space-y-3">
            {highMileageVehicles.map(vehicle => (
              <div key={vehicle.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center">
                  <Car className="w-5 h-5 text-secondary mr-3" />
                  <div>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Mileage</p>
                  <p className="text-sm text-gray-500">
                    {vehicle.mileage.toLocaleString()} km
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Status Overview</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Active</p>
              <p className="text-2xl font-semibold text-green-700">
                {vehicles.filter(v => v.status === 'active').length}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600">Maintenance</p>
              <p className="text-2xl font-semibold text-yellow-700">
                {vehicles.filter(v => v.status === 'maintenance').length}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">Unavailable</p>
              <p className="text-2xl font-semibold text-red-700">
                {vehicles.filter(v => v.status === 'unavailable').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default VehicleReport;