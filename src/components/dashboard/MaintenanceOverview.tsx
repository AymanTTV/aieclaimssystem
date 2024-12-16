import React from 'react';
import { MaintenanceLog, Vehicle } from '../../types';
import { Wrench, AlertCircle, CheckCircle } from 'lucide-react';
import Card from '../Card';
import { format } from 'date-fns';

interface MaintenanceOverviewProps {
  logs: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
}

const MaintenanceOverview: React.FC<MaintenanceOverviewProps> = ({ logs, vehicles }) => {
  const completedCount = logs.filter(log => log.status === 'completed').length;
  const scheduledCount = logs.filter(log => log.status === 'scheduled').length;
  const inProgressCount = logs.filter(log => log.status === 'in-progress').length;

  const totalCost = logs.reduce((sum, log) => sum + log.cost, 0);

  return (
    <Card title="Maintenance Overview">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900">{completedCount}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">Completed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Wrench className="w-5 h-5 text-yellow-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900">{inProgressCount}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">In Progress</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900">{scheduledCount}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">Scheduled</p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Maintenance Cost</span>
            <span className="text-lg font-semibold text-gray-900">
              ${totalCost.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MaintenanceOverview;