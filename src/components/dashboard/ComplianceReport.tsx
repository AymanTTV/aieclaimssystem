import React from 'react';
import { Vehicle } from '../../types';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import Card from '../Card';
import { getUpcomingExpirations, getVehicleExpiryDates } from '../../utils/vehicleUtils';
import { getEarliestDate } from '../../utils/dateUtils';

interface ComplianceReportProps {
  vehicles: Vehicle[];
}

const ComplianceReport: React.FC<ComplianceReportProps> = ({ vehicles }) => {
  const upcomingExpirations = getUpcomingExpirations(vehicles)
    .sort((a, b) => {
      const aExpiryDates = getVehicleExpiryDates(a).map(check => check.date);
      const bExpiryDates = getVehicleExpiryDates(b).map(check => check.date);
      
      const aEarliest = getEarliestDate(aExpiryDates);
      const bEarliest = getEarliestDate(bExpiryDates);
      
      if (!aEarliest || !bEarliest) return 0;
      return aEarliest.getTime() - bEarliest.getTime();
    })
    .slice(0, 5);

  return (
    <Card title="Compliance Alerts">
      <div className="space-y-4">
        {upcomingExpirations.map(vehicle => {
          const expiryDates = getVehicleExpiryDates(vehicle);
          
          return (
            <div key={vehicle.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-1" />
                <div>
                  <p className="font-medium text-gray-900">
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-sm text-gray-500">
                    {vehicle.registrationNumber}
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    {expiryDates.map(({ date, label, type }) => (
                      <p key={type} className={`text-${type === 'mot' ? 'red' : type === 'nsl' ? 'orange' : type === 'roadTax' ? 'yellow' : 'blue'}-600`}>
                        {label} expires: {format(date, 'MMM dd, yyyy')}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {upcomingExpirations.length === 0 && (
          <p className="text-center text-gray-500 py-4">No upcoming compliance deadlines</p>
        )}
      </div>
    </Card>
  );
};

export default ComplianceReport;