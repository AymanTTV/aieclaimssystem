import React from 'react';
import { MaintenanceLog, Vehicle } from '../types';
import StatusBadge from './StatusBadge';
import { format } from 'date-fns';
import { Wrench, DollarSign, Calendar, Building } from 'lucide-react';

interface MaintenanceLogCardProps {
  log: MaintenanceLog;
  vehicle: Vehicle;
}

const MaintenanceLogCard: React.FC<MaintenanceLogCardProps> = ({ log, vehicle }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center">
            <Wrench className="w-5 h-5 text-primary mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {vehicle.make} {vehicle.model}
            </h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {vehicle.registrationNumber}
          </p>
        </div>
        <StatusBadge status={log.status} />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center text-sm">
          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
          <span>{format(log.date, 'MMM dd, yyyy')}</span>
        </div>

        <div className="flex items-center text-sm">
          <Building className="w-4 h-4 text-gray-400 mr-2" />
          <span>{log.serviceProvider}</span>
        </div>

        <div className="flex items-center text-sm">
          <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
          <span>${log.cost.toFixed(2)}</span>
        </div>

        <div className="mt-2">
          <p className="text-sm text-gray-600">{log.description}</p>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceLogCard;