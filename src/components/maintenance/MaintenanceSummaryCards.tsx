import React from 'react';
import { MaintenanceLog } from '../../types/maintenance';
import { Calendar, Wrench, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { differenceInCalendarDays } from 'date-fns';

interface MaintenanceSummaryCardsProps {
  logs: MaintenanceLog[];
}

const MaintenanceSummaryCards: React.FC<MaintenanceSummaryCardsProps> = ({ logs }) => {
  // Destructure isCompany from usePermissions
  const { can, isCompany } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  if (!can('maintenance', 'cards')) return null;

  // status counts
  const totalLogs  = logs.length;
  const scheduled  = logs.filter(l => l.status === 'scheduled').length;
  const inProgress = logs.filter(l => l.status === 'in-progress').length;
  const completed  = logs.filter(l => l.status === 'completed').length;
  const cancelled  = logs.filter(l => l.status === 'cancelled').length;

  // Count due within next 7 days (or overdue)
  const dueWithin7Days = logs.filter(l => {
    if (l.status !== 'scheduled' || !l.date) return false;
    const d = new Date(l.date);
    if (isNaN(d.getTime())) return false;
    return differenceInCalendarDays(d, new Date()) <= 7;
  }).length;

  // financial aggregates
  const totalNet      = logs.reduce((s, l) => s + (l.netAmount || 0), 0);
  const totalVat      = logs.reduce((s, l) => s + (l.vatAmount || 0), 0);
  const totalDiscount = logs.reduce((s, l) => s + (l.totalDiscount || 0), 0);
  const totalCost     = logs.reduce((s, l) => s + (l.cost || 0), 0);
  const totalPaid     = logs.reduce((s, l) => s + (l.paidAmount || 0), 0);
  const totalOwing    = logs.reduce((s, l) => s + (l.remainingAmount || 0), 0);

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {/* Total Maintenance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 sm:p-5">
        <div className="flex items-center">
          <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" />
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-500">Total Maintenance</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{totalLogs}</p>
          </div>
        </div>
      </div>

      {/* Scheduled - Red if due within 7 days */}
      <div className={`bg-white rounded-xl shadow-sm border ${dueWithin7Days > 0 ? 'border-red-300 border-l-4 border-l-red-500 bg-red-50/20' : 'border-gray-200/80'} p-4 sm:p-5`}>
        <div className="flex items-start">
          {dueWithin7Days > 0 ? (
            <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500 animate-pulse mt-0.5" />
          ) : (
            <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-500 mt-0.5" />
          )}
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-500">Scheduled</p>
            <p className={`text-lg sm:text-2xl font-bold ${dueWithin7Days > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {scheduled}
            </p>
            {dueWithin7Days > 0 && (
              <span className="inline-flex items-center text-[10px] font-black text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-full mt-1">
                {dueWithin7Days} due ≤7d
              </span>
            )}
          </div>
        </div>
      </div>

      {/* In-Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 sm:p-5">
        <div className="flex items-center">
          <Wrench className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500" />
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-500">In Progress</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{inProgress}</p>
          </div>
        </div>
      </div>

      {/* Completed */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 sm:p-5">
        <div className="flex items-center">
          <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-500">Completed</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{completed}</p>
          </div>
        </div>
      </div>

      {/* Cancelled */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 sm:p-5">
        <div className="flex items-center">
          <XCircle className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-medium text-gray-500">Cancelled</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">{cancelled}</p>
          </div>
        </div>
      </div>

      {/* Financial Breakdown - Hidden for Company role */}
      {!isCompany && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 p-4 sm:p-5">
          <div className="flex items-start">
            <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-purple-500" />
            <div className="ml-3 sm:ml-4 space-y-1 text-sm w-full">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">NET:</span>
                <span className="font-medium">{formatCurrency(totalNet)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">VAT:</span>
                <span className="font-medium">{formatCurrency(totalVat)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between gap-3 text-red-600">
                  <span className="text-gray-500">Discount:</span>
                  <span className="font-medium">–{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 font-semibold">
                <span className="text-gray-700">Total:</span>
                <span>{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-green-600">
                <span className="text-gray-500">Paid:</span>
                <span className="font-semibold">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-amber-600">
                <span className="text-gray-500">Owing:</span>
                <span className="font-semibold">{formatCurrency(totalOwing)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSummaryCards;