// src/components/dashboard/UrgentAlerts.tsx

import React from 'react';
import { Vehicle, MaintenanceLog } from '../../types';
import { AlertTriangle, Calendar, Car, Wrench } from 'lucide-react';
import Card from '../Card';
import { format, addDays, isValid } from 'date-fns'; // Import isValid

interface UrgentAlertsProps {
  vehicles: Vehicle[];
  maintenanceLogs: MaintenanceLog[];
}

const UrgentAlerts: React.FC<UrgentAlertsProps> = ({ vehicles, maintenanceLogs }) => {
  const today = new Date();
  const thirtyDays = addDays(today, 30);

  // Helper function to check if a date is valid and less than a reference date
  const isDateExpired = (date: Date | null | undefined, referenceDate: Date) => {
    return date && isValid(date) && date < referenceDate;
  };

  // Helper function to check if a date is valid and within a future range
  const isDateExpiringSoon = (date: Date | null | undefined, startDate: Date, endDate: Date) => {
    return date && isValid(date) && date <= endDate && date > startDate;
  };

  // Get vehicles with expired documents
  const expiredVehicles = vehicles.filter(vehicle => {
    if (vehicle.status === 'sold') return false; // Exclude sold vehicles
    
    return (
      isDateExpired(vehicle.motExpiry, today) ||
      isDateExpired(vehicle.insuranceExpiry, today) ||
      isDateExpired(vehicle.roadTaxExpiry, today) ||
      isDateExpired(vehicle.nslExpiry, today)
    );
  });

  // Get vehicles with expiring documents in next 30 days
  const urgentExpirations = vehicles.filter(vehicle => {
    if (vehicle.status === 'sold') return false; // Exclude sold vehicles
    
    // Don't include already expired vehicles in this section
    if (expiredVehicles.includes(vehicle)) return false;
    
    return (
      isDateExpiringSoon(vehicle.motExpiry, today, thirtyDays) ||
      isDateExpiringSoon(vehicle.insuranceExpiry, today, thirtyDays) ||
      isDateExpiringSoon(vehicle.roadTaxExpiry, today, thirtyDays) ||
      isDateExpiringSoon(vehicle.nslExpiry, today, thirtyDays)
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
                    {/* Add isValid check before formatting */}
                    {vehicle.motExpiry && isValid(vehicle.motExpiry) && vehicle.motExpiry < today && (
                      <p className="text-red-700">MOT Expired: {format(vehicle.motExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.insuranceExpiry && isValid(vehicle.insuranceExpiry) && vehicle.insuranceExpiry < today && (
                      <p className="text-red-700">Insurance Expired: {format(vehicle.insuranceExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.nslExpiry && isValid(vehicle.nslExpiry) && vehicle.nslExpiry < today && (
                      <p className="text-red-700">NSL Expired: {format(vehicle.nslExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.roadTaxExpiry && isValid(vehicle.roadTaxExpiry) && vehicle.roadTaxExpiry < today && (
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
                    {/* Add isValid check before formatting */}
                    {vehicle.motExpiry && isValid(vehicle.motExpiry) && vehicle.motExpiry <= thirtyDays && vehicle.motExpiry > today && (
                      <p className="text-amber-600">MOT: {format(vehicle.motExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.insuranceExpiry && isValid(vehicle.insuranceExpiry) && vehicle.insuranceExpiry <= thirtyDays && vehicle.insuranceExpiry > today && (
                      <p className="text-amber-600">Insurance: {format(vehicle.insuranceExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.nslExpiry && isValid(vehicle.nslExpiry) && vehicle.nslExpiry <= thirtyDays && vehicle.nslExpiry > today && (
                      <p className="text-amber-600">NSL: {format(vehicle.nslExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {vehicle.roadTaxExpiry && isValid(vehicle.roadTaxExpiry) && vehicle.roadTaxExpiry <= thirtyDays && vehicle.roadTaxExpiry > today && (
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