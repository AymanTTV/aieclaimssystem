// src/components/dashboard/UrgentAlerts.tsx

import React from 'react';
import { Vehicle, MaintenanceLog } from '../../types';
import { AlertTriangle, Calendar, Car, Wrench } from 'lucide-react';
import Card from '../Card';
import { format, addDays } from 'date-fns';

interface UrgentAlertsProps {
  vehicles: Vehicle[];
  maintenanceLogs: MaintenanceLog[];
}

const UrgentAlerts: React.FC<UrgentAlertsProps> = ({ vehicles, maintenanceLogs }) => {
  const today = new Date();
  const thirtyDays = addDays(today, 30);

  // Get vehicles with expired documents
  const expiredVehicles = vehicles.filter(vehicle => {
    if (vehicle.status === 'sold') return false; // Exclude sold vehicles
    
    return (
      vehicle.motExpiry < today ||
      vehicle.insuranceExpiry < today ||
      vehicle.roadTaxExpiry < today ||
      vehicle.nslExpiry < today
    );
  });

  // Get vehicles with expiring documents in next 30 days
  const urgentExpirations = vehicles.filter(vehicle => {
    if (vehicle.status === 'sold') return false; // Exclude sold vehicles
    
    // Don't include already expired vehicles in this section
    if (expiredVehicles.includes(vehicle)) return false;
    
    return (
      (vehicle.motExpiry <= thirtyDays && vehicle.motExpiry > today) ||
      (vehicle.insuranceExpiry <= thirtyDays && vehicle.insuranceExpiry > today) ||
      (vehicle.roadTaxExpiry <= thirtyDays && vehicle.roadTaxExpiry > today) ||
      (vehicle.nslExpiry <= thirtyDays && vehicle.nslExpiry > today)
    );
  });

  return (
    <Card title="Urgent Alerts">
      <div className="space-y-4">
        {/* Expired Documents Section */}
        {expiredVehicles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Expired Documents ({expiredVehicles.length} vehicles)
            </h4>
            {expiredVehicles.map(vehicle => (
              <div key={vehicle.id} className="bg-red-100 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-gray-600">{vehicle.registrationNumber}</p>
                  </div>
                  <div className="text-right text-sm">
                    {vehicle.motExpiry < today && (
                      <p className="text-red-700">MOT Expired: {format(vehicle.motExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.insuranceExpiry < today && (
                      <p className="text-red-700">Insurance Expired: {format(vehicle.insuranceExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.nslExpiry < today && (
                      <p className="text-red-700">NSL Expired: {format(vehicle.nslExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.roadTaxExpiry < today && (
                      <p className="text-red-700">Road Tax Expired: {format(vehicle.roadTaxExpiry, 'dd/MM/yyyy')}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expiring Documents Section */}
        {urgentExpirations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-amber-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Documents Expiring Within 30 Days ({urgentExpirations.length} vehicles)
            </h4>
            {urgentExpirations.map(vehicle => (
              <div key={vehicle.id} className="bg-amber-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-gray-600">{vehicle.registrationNumber}</p>
                  </div>
                  <div className="text-right text-sm">
                    {vehicle.motExpiry <= thirtyDays && vehicle.motExpiry > today && (
                      <p className="text-amber-600">MOT: {format(vehicle.motExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.insuranceExpiry <= thirtyDays && vehicle.insuranceExpiry > today && (
                      <p className="text-amber-600">Insurance: {format(vehicle.insuranceExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.nslExpiry <= thirtyDays && vehicle.nslExpiry > today && (
                      <p className="text-amber-600">NSL: {format(vehicle.nslExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.roadTaxExpiry <= thirtyDays && vehicle.roadTaxExpiry > today && (
                      <p className="text-amber-600">Road Tax: {format(vehicle.roadTaxExpiry, 'dd/MM/yyyy')}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {expiredVehicles.length === 0 && urgentExpirations.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No urgent alerts at this time
          </p>
        )}
      </div>
    </Card>
  );
};

export default UrgentAlerts;
