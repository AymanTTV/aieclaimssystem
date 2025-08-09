// src/components/maintenance/MaintenanceSummaryCards.tsx
import React from 'react';
import { MaintenanceLog } from '../../types/maintenance';
import {
  Calendar,
  Wrench,
  CheckCircle,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';

interface MaintenanceSummaryCardsProps {
  logs: MaintenanceLog[];
}

const MaintenanceSummaryCards: React.FC<MaintenanceSummaryCardsProps> = ({ logs }) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  if (!can('maintenance', 'cards')) return null;

  // status counts
  const totalLogs   = logs.length;
  const scheduled   = logs.filter(l => l.status === 'scheduled').length;
  const inProgress  = logs.filter(l => l.status === 'in-progress').length;
  const completed   = logs.filter(l => l.status === 'completed').length;
  const cancelled   = logs.filter(l => l.status === 'cancelled').length;

  // financial aggregates
  const totalNet      = logs.reduce((sum, l) => sum + (l.netAmount || 0), 0);
  const totalVat      = logs.reduce((sum, l) => sum + (l.vatAmount || 0), 0);
  const totalDiscount = logs.reduce((sum, l) => sum + (l.totalDiscount || 0), 0);
  const totalCost     = logs.reduce((sum, l) => sum + (l.cost     || 0), 0);
  const totalPaid     = logs.reduce((sum, l) => sum + (l.paidAmount|| 0), 0);
  const totalOwing    = logs.reduce((sum, l) => sum + (l.remainingAmount|| 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {/* Total Maintenance */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Calendar className="w-8 h-8 text-blue-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Total Maintenance</p>
            <p className="text-2xl font-semibold text-gray-900">{totalLogs}</p>
          </div>
        </div>
      </div>

      {/* Scheduled */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Calendar className="w-8 h-8 text-yellow-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Scheduled</p>
            <p className="text-2xl font-semibold text-gray-900">{scheduled}</p>
          </div>
        </div>
      </div>

      {/* In-Progress */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <Wrench className="w-8 h-8 text-blue-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">In Progress</p>
            <p className="text-2xl font-semibold text-gray-900">{inProgress}</p>
          </div>
        </div>
      </div>

      {/* Completed */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Completed</p>
            <p className="text-2xl font-semibold text-gray-900">{completed}</p>
          </div>
        </div>
      </div>

      {/* Cancelled */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center">
          <XCircle className="w-8 h-8 text-red-500" />
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Cancelled</p>
            <p className="text-2xl font-semibold text-gray-900">{cancelled}</p>
          </div>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start">
          <DollarSign className="w-8 h-8 text-purple-500" />
          <div className="ml-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">NET:</span>
              <span>{formatCurrency(totalNet)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">VAT:</span>
              <span>{formatCurrency(totalVat)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span className="text-gray-500">Discount:</span>
                <span>–{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span className="text-gray-700">Total:</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span className="text-gray-500">Paid:</span>
              <span>{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span className="text-gray-500">Owing:</span>
              <span>{formatCurrency(totalOwing)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSummaryCards;
