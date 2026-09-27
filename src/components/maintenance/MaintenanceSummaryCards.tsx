import React from 'react';
import { MaintenanceLog, isOffRoadAccidentLog } from '../../types/maintenance';
import { Calendar, Wrench, CheckCircle, XCircle, DollarSign, AlertTriangle, Package, Building2, ShieldAlert } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { differenceInCalendarDays } from 'date-fns';

interface MaintenanceSummaryCardsProps {
  logs: MaintenanceLog[];
  activeStatusFilter?: string;
  onSelectStatusFilter?: (status: string) => void;
  activeRoadConditionFilter?: string;
  onSelectRoadConditionFilter?: (condition: string) => void;
}

const MaintenanceSummaryCards: React.FC<MaintenanceSummaryCardsProps> = ({ 
  logs,
  activeStatusFilter = 'all',
  onSelectStatusFilter,
  activeRoadConditionFilter = 'all',
  onSelectRoadConditionFilter
}) => {
  // Destructure isCompany from usePermissions
  const { can, isCompany } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  if (!can('maintenance', 'cards')) return null;

  // status counts
  const totalLogs  = logs.length;
  const scheduled  = logs.filter(l => l.status === 'scheduled').length;
  const inProgress = logs.filter(l => l.status === 'in-progress').length;
  const workshop   = logs.filter(l => l.status === 'workshop' || (l.status as any) === 'in workshop').length;
  const partsBackorder = logs.filter(l => l.status === 'parts-backorder' || l.status === 'awaiting-parts' || (l.status as any) === 'parts backorder').length;
  const bodywork   = logs.filter(l => l.status === 'bodywork').length;
  const completed  = logs.filter(l => l.status === 'completed').length;
  const cancelled  = logs.filter(l => l.status === 'cancelled').length;

  // Off-road accident counts
  const offRoadAccidentsTotal = logs.filter(l => isOffRoadAccidentLog(l) || l.status === 'off-road' || l.status === 'OFF ROAD (VOR)' || l.status === 'vor').length;
  const offRoadAccidentsActive = logs.filter(l => (isOffRoadAccidentLog(l) || l.status === 'off-road' || l.status === 'OFF ROAD (VOR)' || l.status === 'vor') && l.status !== 'completed' && l.status !== 'cancelled').length;

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

  const handleRoadConditionClick = () => {
    if (!onSelectRoadConditionFilter) return;
    if (activeRoadConditionFilter === 'off-road-accident') {
      onSelectRoadConditionFilter('all');
    } else {
      onSelectRoadConditionFilter('off-road-accident');
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-4">
      {/* 1. Total Maintenance */}
      <div 
        onClick={() => handleCardClick('all')}
        role="button"
        tabIndex={0}
        title="Click to show all maintenance logs"
        className={`rounded-2xl shadow-xs border p-3.5 sm:p-4 text-slate-900 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-xs min-w-0 ${
          activeStatusFilter === 'all' && activeRoadConditionFilter === 'all'
            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400/50'
            : 'bg-white border-slate-200 hover:border-blue-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
              TOTAL
            </p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight mt-1">
              {totalLogs}
            </p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border bg-blue-50 border-blue-200 text-blue-600 shadow-xs shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>All maintenance</span>
        </div>
      </div>

      {/* 2. Off-Road Accidents Card (VOR) */}
      <div
        onClick={handleRoadConditionClick}
        role="button"
        tabIndex={0}
        title="Click to filter by off-road non-drivable accident repairs (VOR)"
        className={`rounded-2xl shadow-xs border p-3.5 sm:p-4 text-slate-900 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-xs min-w-0 ${
          activeRoadConditionFilter === 'off-road-accident'
            ? 'bg-rose-50/90 border-rose-500 ring-2 ring-rose-400/50'
            : 'bg-white border-slate-200 hover:border-rose-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-700 truncate">
              OFF ROAD (VOR)
            </p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-rose-900 tracking-tight mt-1">
              {offRoadAccidentsTotal}
            </p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-600 shadow-xs shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          {offRoadAccidentsActive > 0 ? (
            <span className="inline-flex items-center text-[10px] font-extrabold text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-full">
              🚨 {offRoadAccidentsActive} VOR
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Fleet active</span>
          )}
        </div>
      </div>

      {/* 3. Scheduled */}
      <div 
        onClick={() => handleCardClick('scheduled')}
        role="button"
        tabIndex={0}
        title="Click to filter by Scheduled status"
        className={`rounded-2xl shadow-xs border p-3.5 sm:p-4 text-slate-900 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-xs min-w-0 ${
          activeStatusFilter === 'scheduled'
            ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/50'
            : dueWithin7Days > 0
            ? 'bg-white border-red-200 hover:border-red-300'
            : 'bg-white border-slate-200 hover:border-amber-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate ${dueWithin7Days > 0 ? 'text-red-700' : 'text-amber-800'}`}>
              SCHEDULED
            </p>
            <p className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-1 ${dueWithin7Days > 0 ? 'text-red-700' : 'text-amber-900'}`}>
              {scheduled}
            </p>
          </div>
          <div className={`p-2 sm:p-2.5 rounded-xl border shadow-xs shrink-0 ${
            dueWithin7Days > 0
              ? 'bg-red-50 border-red-200 text-red-600'
              : 'bg-amber-50 border-amber-200 text-amber-600'
          }`}>
            {dueWithin7Days > 0 ? (
              <AlertTriangle className="w-5 h-5 animate-pulse text-red-600" />
            ) : (
              <Calendar className="w-5 h-5 text-amber-600" />
            )}
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          {dueWithin7Days > 0 ? (
            <span className="inline-flex items-center text-[10px] font-extrabold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded-full">
              ⚠️ {dueWithin7Days} due ≤7d
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">On schedule</span>
          )}
        </div>
      </div>

      {/* 4. In Progress */}
      <div 
        onClick={() => handleCardClick('in-progress')}
        role="button"
        tabIndex={0}
        title="Click to filter by In Progress status"
        className={`rounded-2xl shadow-xs border p-3.5 sm:p-4 text-slate-900 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-xs min-w-0 ${
          activeStatusFilter === 'in-progress'
            ? 'bg-orange-50/90 border-orange-500 ring-2 ring-orange-400/50'
            : 'bg-white border-slate-200 hover:border-orange-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-orange-700 truncate">
              IN PROGRESS
            </p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-orange-900 tracking-tight mt-1">
              {inProgress}
            </p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border bg-orange-50 border-orange-200 text-orange-600 shadow-xs shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          <span className="text-[11px] text-orange-700 font-medium">Active repairs</span>
        </div>
      </div>

      {/* 5. In Workshop */}
      <div 
        onClick={() => handleCardClick('workshop')}
        role="button"
        tabIndex={0}
        title="Click to filter by In Workshop status"
        className={`rounded-2xl shadow-xs border p-3.5 sm:p-4 text-slate-900 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-xs min-w-0 ${
          activeStatusFilter === 'workshop'
            ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-400/50'
            : 'bg-white border-slate-200 hover:border-purple-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-purple-700 truncate">
              IN WORKSHOP
            </p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-purple-950 tracking-tight mt-1">
              {workshop}
            </p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border bg-purple-50 border-purple-200 text-purple-600 shadow-xs shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          <span className="text-[11px] text-purple-700 font-medium">At service garage</span>
        </div>
      </div>

      {/* 6. Awaiting Parts */}
      <div 
        onClick={() => handleCardClick('parts-backorder')}
        role="button"
        tabIndex={0}
        title="Click to filter by Awaiting Parts status"
        className={`rounded-2xl shadow-xs border p-3.5 sm:p-4 text-slate-900 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-xs min-w-0 ${
          activeStatusFilter === 'parts-backorder'
            ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/50'
            : 'bg-white border-slate-200 hover:border-amber-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-800 truncate">
              AWAITING PARTS
            </p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-amber-950 tracking-tight mt-1">
              {partsBackorder}
            </p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-600 shadow-xs shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          <span className="inline-flex items-center text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
            📦 Date not required
          </span>
        </div>
      </div>

      {/* 7. Bodywork */}
      <div 
        onClick={() => handleCardClick('bodywork')}
        role="button"
        tabIndex={0}
        title="Click to filter by Bodywork status"
        className={`rounded-2xl shadow-xs border p-3.5 sm:p-4 text-slate-900 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-xs min-w-0 ${
          activeStatusFilter === 'bodywork'
            ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-400/50'
            : 'bg-white border-slate-200 hover:border-indigo-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 truncate">
              BODYWORK
            </p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-indigo-950 tracking-tight mt-1">
              {bodywork}
            </p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-600 shadow-xs shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          <span className="text-[11px] text-indigo-700 font-medium">Bodyshop & panels</span>
        </div>
      </div>

      {/* 8. Completed */}
      <div 
        onClick={() => handleCardClick('completed')}
        role="button"
        tabIndex={0}
        title="Click to filter by Completed status"
        className={`rounded-2xl shadow-xs border p-3.5 sm:p-4 text-slate-900 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-xs min-w-0 ${
          activeStatusFilter === 'completed'
            ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-400/50'
            : 'bg-white border-slate-200 hover:border-emerald-300'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 truncate">
              COMPLETED
            </p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-950 tracking-tight mt-1">
              {completed}
            </p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-600 shadow-xs shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          <span className="text-[11px] text-emerald-700 font-medium">Finished jobs</span>
        </div>
      </div>

      {/* 9. Cancelled */}
      <div 
        onClick={() => handleCardClick('cancelled')}
        role="button"
        tabIndex={0}
        title="Click to filter by Cancelled status"
        className={`rounded-2xl shadow-xs border p-3.5 sm:p-4 text-slate-900 flex flex-col justify-between transition-all duration-150 cursor-pointer hover:shadow-xs min-w-0 ${
          activeStatusFilter === 'cancelled'
            ? 'bg-slate-100 border-slate-500 ring-2 ring-slate-400/40'
            : 'bg-white border-slate-200 hover:border-slate-400'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">
              CANCELLED
            </p>
            <p className="text-2xl sm:text-3xl font-black font-mono text-slate-800 tracking-tight mt-1">
              {cancelled}
            </p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-500 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium">Voided logs</span>
        </div>
      </div>

      {/* 10. Financial Breakdown - Exact match to user's screenshot */}
      {!isCompany && (
        <div className="bg-[#FAF5FF] rounded-2xl shadow-xs border border-[#E9D5FF] p-3.5 sm:p-4 text-[#0F172A] flex flex-col justify-between hover:border-purple-300 transition-all duration-200 min-w-0">
          <div className="flex items-start">
            <div className="p-2 rounded-2xl border bg-white border-[#E9D5FF] text-slate-800 shadow-xs shrink-0 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-slate-900" />
            </div>
            <div className="ml-3 space-y-1 text-xs sm:text-[13px] w-full min-w-0">
              <div className="flex items-center justify-between gap-2 text-[#000000]">
                <span className="font-bold text-[#000000]">NET:</span>
                <span className="font-mono font-bold text-[#000000]">{formatCurrency(totalNet)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[#2563EB]">
                <span className="font-bold text-[#2563EB]">VAT:</span>
                <span className="font-mono font-bold text-[#2563EB]">{formatCurrency(totalVat)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[#D97706]">
                <span className="font-bold text-[#D97706]">Discount:</span>
                <span className="font-mono font-bold text-[#D97706] text-right">
                  {totalDiscount > 0 ? `-${formatCurrency(totalDiscount)}` : '£0.00'}
                </span>
              </div>
              <div className="border-t border-[#E2E8F0] my-1 pt-0.5">
                <div className="flex items-center justify-between gap-2 text-[#D97706]">
                  <span className="font-bold text-[#D97706]">Total:</span>
                  <span className="font-mono font-bold text-[#D97706]">{formatCurrency(totalCost)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 text-[#047857]">
                <span className="font-bold text-[#047857]">Paid:</span>
                <span className="font-mono font-bold text-[#047857]">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[#DC2626]">
                <span className="font-bold text-[#DC2626]">Owing:</span>
                <span className="font-mono font-bold text-[#DC2626]">{formatCurrency(totalOwing)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceSummaryCards;