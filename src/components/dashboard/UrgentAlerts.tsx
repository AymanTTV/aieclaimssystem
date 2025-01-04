import React from 'react';
import { Vehicle, MaintenanceLog } from '../../types';
import { AlertTriangle, Calendar, Car, Wrench } from 'lucide-react';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import { format, addDays } from 'date-fns';
import Card from '../Card';

interface UrgentAlertsProps {
  vehicles: Vehicle[];
  maintenanceLogs: MaintenanceLog[];
}

const UrgentAlerts: React.FC<UrgentAlertsProps> = ({ vehicles, maintenanceLogs }) => {
  // Get vehicles with expiring documents in next 7 days
  const urgentExpirations = vehicles.filter(vehicle => {
    const today = new Date();
    const sevenDays = addDays(today, 7);
    
    return (
      (vehicle.motExpiry <= sevenDays && vehicle.motExpiry > today) ||
      (vehicle.insuranceExpiry <= sevenDays && vehicle.insuranceExpiry > today) ||
      (vehicle.roadTaxExpiry <= sevenDays && vehicle.roadTaxExpiry > today) ||
      (vehicle.nslExpiry <= sevenDays && vehicle.nslExpiry > today)
    );
  });

  // Get overdue maintenance
  const overdueMaintenanceLogs = maintenanceLogs
    .filter(log => log.status === 'scheduled' && new Date(log.date) < new Date())
    .slice(0, 3);

  // Get vehicles requiring immediate attention
  const criticalVehicles = vehicles.filter(vehicle => 
    isExpiringOrExpired(vehicle.motExpiry) ||
    isExpiringOrExpired(vehicle.insuranceExpiry) ||
    vehicle.status === 'maintenance'
  ).slice(0, 3);

  return (
    <Card title="Urgent Alerts">
      <div className="space-y-4">
        {/* Document Expirations */}
        {urgentExpirations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Urgent Document Expirations
            </h4>
            {urgentExpirations.map(vehicle => (
              <div key={vehicle.id} className="bg-red-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-gray-600">{vehicle.registrationNumber}</p>
                  </div>
                  <div className="text-right text-sm">
                    {isExpiringOrExpired(vehicle.motExpiry) && (
                      <p className="text-red-600">MOT: {format(vehicle.motExpiry, 'dd/MM/yyyy')}</p>
                    )}
                    {isExpiringOrExpired(vehicle.insuranceExpiry) && (
                      <p className="text-red-600">Insurance: {format(vehicle.insuranceExpiry, 'dd/MM/yyyy')}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Overdue Maintenance */}
        {overdueMaintenanceLogs.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-amber-600 flex items-center">
              <Wrench className="w-4 h-4 mr-1" />
              Overdue Maintenance
            </h4>
            {overdueMaintenanceLogs.map(log => {
              const vehicle = vehicles.find(v => v.id === log.vehicleId);
              return (
                <div key={log.id} className="bg-amber-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{vehicle?.make} {vehicle?.model}</p>
                      <p className="text-sm text-gray-600">{log.type}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p>Due: {format(log.date, 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Critical Vehicles */}
        {criticalVehicles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600 flex items-center">
              <Car className="w-4 h-4 mr-1" />
              Vehicles Requiring Attention
            </h4>
            {criticalVehicles.map(vehicle => (
              <div key={vehicle.id} className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-gray-600">{vehicle.registrationNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {vehicle.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {urgentExpirations.length === 0 && 
         overdueMaintenanceLogs.length === 0 && 
         criticalVehicles.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No urgent alerts at this time
          </p>
        )}
      </div>
    </Card>
  );
};

export default UrgentAlerts;