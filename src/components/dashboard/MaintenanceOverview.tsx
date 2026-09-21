import React from 'react';
import { MaintenanceLog } from '../../types';
import { Wrench, CheckCircle, Clock, AlertCircle, AlertTriangle } from 'lucide-react';
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
    <div className="bg-[#0c101c] rounded-2xl shadow-xl p-5 sm:p-6 text-white relative overflow-hidden border border-slate-800/90 flex flex-col justify-between h-full">
      <Wrench className="absolute -right-3 -bottom-5 w-36 h-36 text-white/[0.04] pointer-events-none select-none" />

      <div>
        <div className="flex items-center justify-between mb-5 relative z-10">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-mono">
            Maintenance Status
          </p>
          <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-xl shadow-xs">
            <Wrench className="h-5 w-5 text-slate-100" />
          </div>
        </div>

        {/* Urgent Maintenance Due Within 7 Days Warning */}
        {dueWithin7Days > 0 && (
          <div className="mb-3 flex items-center justify-between p-3 bg-[#241014] border border-red-500/50 rounded-xl text-red-200 relative z-10 shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-300">Due in Next 7 Days</span>
            </div>
            <span className="text-xs font-black bg-red-500/30 text-red-200 border border-red-500/50 px-2.5 py-0.5 rounded-full font-mono">
              {dueWithin7Days} {dueWithin7Days === 1 ? 'vehicle' : 'vehicles'}
            </span>
          </div>
        )}

        <div className="space-y-3 relative z-10">
          <div className="flex justify-between items-center bg-[#2b1704] border border-orange-500/50 hover:border-orange-400/80 p-3.5 rounded-xl transition-all duration-150 shadow-sm">
            <div className="flex items-center space-x-2.5">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 font-bold text-sm tracking-wide">In Progress</span>
            </div>
            <span className="font-mono font-black text-orange-200 text-2xl tracking-tight">
              {inProgressCount}
            </span>
          </div>

          <div className={`flex justify-between items-center ${dueWithin7Days > 0 ? 'bg-[#241014] border-red-500/50 hover:border-red-400/70' : 'bg-[#28220e] border-amber-500/40 hover:border-amber-400/70'} border p-3.5 rounded-xl transition-all duration-150 shadow-sm`}>
            <div className="flex items-center space-x-2.5">
              {dueWithin7Days > 0 ? (
                <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
              <span className={`font-bold text-sm tracking-wide ${dueWithin7Days > 0 ? 'text-red-300' : 'text-amber-300'}`}>
                Scheduled
              </span>
            </div>
            <span className={`font-mono font-black text-2xl tracking-tight ${dueWithin7Days > 0 ? 'text-red-400' : 'text-amber-100'}`}>
              {scheduledCount}
            </span>
          </div>

          {!isCompany && (
            <div className="flex justify-between items-center bg-[#0d261b] border border-emerald-500/40 hover:border-emerald-400/70 p-3.5 rounded-xl transition-all duration-150 shadow-sm">
              <div className="flex items-center space-x-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300 font-bold text-sm tracking-wide">Completed</span>
              </div>
              <span className="font-mono font-black text-emerald-100 text-2xl tracking-tight">
                {completedCount}
              </span>
            </div>
          )}
        </div>
      </div>

      {user?.role === 'manager' && (
        <div className="pt-4 mt-5 border-t border-slate-800/80 relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Total Expenses
            </span>
            <span className="text-lg font-black font-mono text-white">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceOverview;