import React from 'react';
import { MaintenanceLog } from '../../types/maintenance';
import { Calendar, Wrench, CheckCircle, XCircle, DollarSign, AlertTriangle } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { differenceInCalendarDays } from 'date-fns';

interface MaintenanceSummaryCardsProps {
  logs: MaintenanceLog[];
  activeStatusFilter?: string;
  onSelectStatusFilter?: (status: string) => void;
}

const MaintenanceSummaryCards: React.FC<MaintenanceSummaryCardsProps> = ({ 
  logs,
  activeStatusFilter = 'all',
  onSelectStatusFilter
}) => {
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

  const handleCardClick = (status: string) => {
    if (!onSelectStatusFilter) return;
    if (activeStatusFilter === status) {
      onSelectStatusFilter('all');
    } else {
      onSelectStatusFilter(status);
    }
  };

  return (
    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {/* Total Maintenance */}
      <div 
        onClick={() => handleCardClick('all')}
        role="button"
        tabIndex={0}
        title="Click to show all maintenance logs"
        className={`bg-[#16192B] rounded-2xl shadow-xl border p-4 sm:p-5 text-white flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === 'all'
            ? 'border-blue-400 ring-2 ring-blue-500/50 shadow-blue-900/30'
            : 'border-[#2B314E] hover:border-blue-400/50'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2.5 rounded-xl border bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-xs">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-bold text-blue-300 uppercase tracking-wider">Total</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">{totalLogs}</p>
          </div>
        </div>
      </div>

      {/* Scheduled - Red if due within 7 days */}
      <div 
        onClick={() => handleCardClick('scheduled')}
        role="button"
        tabIndex={0}
        title="Click to filter by Scheduled status"
        className={`bg-[#16192B] rounded-2xl shadow-xl border p-4 sm:p-5 text-white flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === 'scheduled'
            ? 'border-amber-400 ring-2 ring-amber-500/50'
            : dueWithin7Days > 0 
              ? 'border-red-500/80 border-l-4 !border-l-red-500 bg-[#1E1624] hover:border-red-400' 
              : 'border-[#2B314E] hover:border-amber-400/50'
        }`}
      >
        <div className="flex items-start">
          <div className={`p-2.5 rounded-xl border shadow-xs ${dueWithin7Days > 0 ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
            {dueWithin7Days > 0 ? (
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </div>
          <div className="ml-3 sm:ml-4">
            <p className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${dueWithin7Days > 0 ? 'text-red-300' : 'text-amber-300'}`}>
              Scheduled
            </p>
            <p className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${dueWithin7Days > 0 ? 'text-red-400' : 'text-amber-200'}`}>
              {scheduled}
            </p>
            {dueWithin7Days > 0 && (
              <span className="inline-flex items-center text-[10px] font-black text-red-200 bg-red-500/30 border border-red-500/50 px-2 py-0.5 rounded-full mt-1">
                {dueWithin7Days} due ≤7d
              </span>
            )}
          </div>
        </div>
      </div>

      {/* In-Progress */}
      <div 
        onClick={() => handleCardClick('in-progress')}
        role="button"
        tabIndex={0}
        title="Click to filter by In Progress status"
        className={`bg-[#16192B] rounded-2xl shadow-xl border p-4 sm:p-5 text-white flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === 'in-progress'
            ? 'border-orange-400 ring-2 ring-orange-500/50'
            : 'border-[#2B314E] hover:border-orange-400/50'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2.5 rounded-xl border bg-orange-500/15 border-orange-500/30 text-orange-400 shadow-xs">
            <Wrench className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-bold text-orange-300 uppercase tracking-wider">In Progress</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-orange-200 tracking-tight">{inProgress}</p>
          </div>
        </div>
      </div>

      {/* Completed */}
      <div 
        onClick={() => handleCardClick('completed')}
        role="button"
        tabIndex={0}
        title="Click to filter by Completed status"
        className={`bg-[#16192B] rounded-2xl shadow-xl border p-4 sm:p-5 text-white flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === 'completed'
            ? 'border-emerald-400 ring-2 ring-emerald-500/50'
            : 'border-[#2B314E] hover:border-emerald-400/50'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2.5 rounded-xl border bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-xs">
            <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-wider">Completed</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-300 tracking-tight">{completed}</p>
          </div>
        </div>
      </div>

      {/* Cancelled */}
      <div 
        onClick={() => handleCardClick('cancelled')}
        role="button"
        tabIndex={0}
        title="Click to filter by Cancelled status"
        className={`bg-[#16192B] rounded-2xl shadow-xl border p-4 sm:p-5 text-white flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === 'cancelled'
            ? 'border-slate-400 ring-2 ring-slate-400/50'
            : 'border-[#2B314E] hover:border-slate-400/50'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2.5 rounded-xl border bg-slate-800/80 border-slate-700/60 text-slate-400 shadow-xs">
            <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider">Cancelled</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-slate-300 tracking-tight">{cancelled}</p>
          </div>
        </div>
      </div>

      {/* Financial Breakdown - Hidden for Company role */}
      {!isCompany && (
        <div className="bg-[#16192B] rounded-2xl shadow-xl border border-[#2B314E] p-4 sm:p-5 text-white flex flex-col justify-between hover:border-[#3D456E] transition-all duration-200">
          <div className="flex items-start">
            <div className="p-2 rounded-xl border bg-purple-500/15 border-purple-500/30 text-purple-400 shadow-xs shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="ml-3 space-y-1 text-xs sm:text-sm w-full">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 font-medium">NET:</span>
                <span className="font-mono text-white">{formatCurrency(totalNet)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-blue-300 font-medium">VAT:</span>
                <span className="font-mono text-blue-300">{formatCurrency(totalVat)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between gap-2 text-purple-300">
                  <span className="font-medium">Discount:</span>
                  <span className="font-mono">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 font-bold text-slate-100 border-t border-slate-800/80 pt-1">
                <span>Total:</span>
                <span className="font-mono text-white">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-emerald-400">
                <span className="font-medium">Paid:</span>
                <span className="font-mono font-semibold text-emerald-300">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-amber-400">
                <span className="font-bold">Owing:</span>
                <span className="font-mono font-bold text-amber-300">{formatCurrency(totalOwing)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSummaryCards;