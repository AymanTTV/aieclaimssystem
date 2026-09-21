import React from 'react';
import { MaintenanceLog } from '../../types';
import { Wrench, CheckCircle, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
import Card from '../Card';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { differenceInCalendarDays, isValid } from 'date-fns';

interface MaintenanceOverviewProps {
  logs: MaintenanceLog[];
}

const MaintenanceOverview: React.FC<MaintenanceOverviewProps> = ({ logs }) => {
  const { formatCurrency } = useFormattedDisplay();
  const { user } = useAuth();
  const { can, isCompany } = usePermissions();

  if (!can('maintenance', 'view')) return null;

  const completedCount = logs.filter(log => log.status === 'completed').length;
  const inProgressCount = logs.filter(log => log.status === 'in-progress').length;
  const scheduledCount = logs.filter(log => log.status === 'scheduled').length;
  const totalExpenses = logs.reduce((sum, log) => sum + log.cost, 0);

  const dueWithin7Days = logs.filter(log => {
    if (log.status !== 'scheduled' || !log.date) return false;
    const d = new Date(log.date);
    if (!isValid(d)) return false;
    const days = differenceInCalendarDays(d, new Date());
    return days <= 7;
  }).length;

  return (
    <Card title="Maintenance Overview">
      <div className="space-y-4">
        {/* Urgent Maintenance Due Within 7 Days Warning */}
        {dueWithin7Days > 0 && (
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Due in Next 7 Days</span>
            </div>
            <span className="text-xs font-black bg-red-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
              {dueWithin7Days} {dueWithin7Days === 1 ? 'vehicle' : 'vehicles'}
            </span>
          </div>
        )}

        <div className={`grid ${isCompany ? 'grid-cols-2' : 'grid-cols-3'} gap-4`}>
          {!isCompany && (
            <div className="text-center">
              <div className="flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="ml-2 text-xl font-semibold text-gray-900">{completedCount}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">Completed</p>
            </div>
          )}
          <div className="text-center">
            <div className="flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="ml-2 text-xl font-semibold text-gray-900">{inProgressCount}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">In Progress</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center">
              <AlertCircle className={`w-5 h-5 ${dueWithin7Days > 0 ? 'text-red-500' : 'text-blue-500'}`} />
              <span className={`ml-2 text-xl font-semibold ${dueWithin7Days > 0 ? 'text-red-600' : 'text-gray-900'}`}>{scheduledCount}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">Scheduled</p>
          </div>
        </div>
        {user?.role === 'manager' && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Maintenance Expenses</span>
            <span className="text-lg font-semibold text-gray-900">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>
        )}
      </div>
    </Card>
  );
};

export default MaintenanceOverview;