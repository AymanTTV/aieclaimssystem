import React from 'react';
import { MaintenanceLog } from '../../types';
import { Wrench, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import Card from '../Card';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'; // Import the hook

interface MaintenanceOverviewProps {
  logs: MaintenanceLog[];
}

const MaintenanceOverview: React.FC<MaintenanceOverviewProps> = ({ logs }) => {
  const { formatCurrency } = useFormattedDisplay(); // Use the hook

  const completedCount = logs.filter(log => log.status === 'completed').length;
  const inProgressCount = logs.filter(log => log.status === 'in-progress').length;
  const scheduledCount = logs.filter(log => log.status === 'scheduled').length;

  const totalExpenses = logs.reduce((sum, log) => sum + log.cost, 0);

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
              <Clock className="w-5 h-5 text-yellow-500" />
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
            <span className="text-sm text-gray-600">Total Maintenance Expenses</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MaintenanceOverview;