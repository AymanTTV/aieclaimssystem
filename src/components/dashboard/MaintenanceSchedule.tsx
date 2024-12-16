import React from 'react';
import { Wrench } from 'lucide-react';
import Card from '../Card';
import { format } from 'date-fns';
import { MaintenanceLog, Vehicle } from '../../types';

interface MaintenanceScheduleProps {
  tasks: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
}

const MaintenanceSchedule: React.FC<MaintenanceScheduleProps> = ({ tasks, vehicles }) => {
  return (
    <Card title="Upcoming Maintenance">
      <div className="space-y-4">
        {tasks.map(task => {
          const vehicle = vehicles[task.vehicleId];
          if (!vehicle) return null;

          return (
            <div key={task.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-3">
                <Wrench className="w-5 h-5 text-primary mt-1" />
                <div>
                  <p className="font-medium text-gray-900">
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-sm text-gray-500">
                    {vehicle.registrationNumber}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(task.date, 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {task.type}
              </span>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <p className="text-center text-gray-500 py-4">No upcoming maintenance</p>
        )}
      </div>
    </Card>
  );
};

export default MaintenanceSchedule;