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
        className={`bg-[#F0F9FF] rounded-2xl shadow-xs border p-4 sm:p-5 text-[#0F172A] flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === 'all'
            ? 'border-blue-500 ring-2 ring-blue-500/30'
            : 'border-[#BAE6FD] hover:border-blue-400'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2.5 rounded-xl border bg-white border-[#BAE6FD] text-[#0284C7] shadow-xs">
            <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-bold text-[#0284C7] uppercase tracking-wider">Total</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-[#0369A1] tracking-tight">{totalLogs}</p>
          </div>
        </div>
      </div>

      {/* Scheduled - Red if due within 7 days */}
      <div 
        onClick={() => handleCardClick('scheduled')}
        role="button"
        tabIndex={0}
        title="Click to filter by Scheduled status"
        className={`rounded-2xl shadow-xs border p-4 sm:p-5 text-[#0F172A] flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          dueWithin7Days > 0 
            ? 'bg-[#FEF2F2] border-[#FECACA] hover:border-red-300'
            : 'bg-[#FFFBEB] border-[#FDE68A] hover:border-amber-300'
        } ${
          activeStatusFilter === 'scheduled'
            ? 'ring-2 ring-amber-500/50'
            : ''
        }`}
      >
        <div className="flex items-start">
          <div className={`p-2.5 rounded-xl border shadow-xs ${dueWithin7Days > 0 ? 'bg-white border-[#FECACA] text-[#DC2626] animate-pulse' : 'bg-white border-[#FDE68A] text-[#D97706]'}`}>
            {dueWithin7Days > 0 ? (
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
            ) : (
              <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />
            )}
          </div>
          <div className="ml-3 sm:ml-4">
            <p className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${dueWithin7Days > 0 ? 'text-[#DC2626]' : 'text-[#D97706]'}`}>
              Scheduled
            </p>
            <p className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${dueWithin7Days > 0 ? 'text-[#B91C1C]' : 'text-[#B45309]'}`}>
              {scheduled}
            </p>
            {dueWithin7Days > 0 && (
              <span className="inline-flex items-center text-[10px] font-black text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full mt-1">
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
        className={`bg-[#FFF7ED] rounded-2xl shadow-xs border p-4 sm:p-5 text-[#0F172A] flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === 'in-progress'
            ? 'border-orange-500 ring-2 ring-orange-500/30'
            : 'border-[#FED7AA] hover:border-orange-400'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2.5 rounded-xl border bg-white border-[#FED7AA] text-[#EA580C] shadow-xs">
            <Wrench className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-bold text-[#EA580C] uppercase tracking-wider">In Progress</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-[#C2410C] tracking-tight">{inProgress}</p>
          </div>
        </div>
      </div>

      {/* Completed */}
      <div 
        onClick={() => handleCardClick('completed')}
        role="button"
        tabIndex={0}
        title="Click to filter by Completed status"
        className={`bg-[#ECFDF5] rounded-2xl shadow-xs border p-4 sm:p-5 text-[#0F172A] flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === 'completed'
            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
            : 'border-[#A7F3D0] hover:border-emerald-400'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2.5 rounded-xl border bg-white border-[#A7F3D0] text-[#059669] shadow-xs">
            <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-bold text-[#059669] uppercase tracking-wider">Completed</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-[#047857] tracking-tight">{completed}</p>
          </div>
        </div>
      </div>

      {/* Cancelled */}
      <div 
        onClick={() => handleCardClick('cancelled')}
        role="button"
        tabIndex={0}
        title="Click to filter by Cancelled status"
        className={`bg-[#F8FAFC] rounded-2xl shadow-xs border p-4 sm:p-5 text-[#0F172A] flex flex-col justify-between transition-all duration-200 relative overflow-hidden group cursor-pointer ${
          activeStatusFilter === 'cancelled'
            ? 'border-slate-500 ring-2 ring-slate-400/30'
            : 'border-[#CBD5E1] hover:border-slate-400'
        }`}
      >
        <div className="flex items-center">
          <div className="p-2.5 rounded-xl border bg-white border-[#CBD5E1] text-[#64748B] shadow-xs">
            <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="ml-3 sm:ml-4">
            <p className="text-xs sm:text-sm font-bold text-[#64748B] uppercase tracking-wider">Cancelled</p>
            <p className="text-xl sm:text-2xl font-black font-mono text-[#334155] tracking-tight">{cancelled}</p>
          </div>
        </div>
      </div>

      {/* Financial Breakdown - Hidden for Company role */}
      {!isCompany && (
        <div className="bg-[#FAF5FF] rounded-2xl shadow-xs border border-[#E9D5FF] p-4 sm:p-5 text-[#0F172A] flex flex-col justify-between hover:border-purple-300 transition-all duration-200">
          <div className="flex items-start">
            <div className="p-2 rounded-xl border bg-white border-[#E9D5FF] text-[#7E22CE] shadow-xs shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="ml-3 space-y-1 text-xs sm:text-sm w-full">
              <div className="flex items-center justify-between gap-2 text-[#000000]">
                <span className="font-semibold text-[#000000]">NET:</span>
                <span className="font-mono font-semibold text-[#000000]">{formatCurrency(totalNet)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[#2563EB]">
                <span className="font-semibold text-[#2563EB]">VAT:</span>
                <span className="font-mono font-semibold text-[#2563EB]">{formatCurrency(totalVat)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between gap-2 text-[#D97706]">
                  <span className="font-semibold text-[#D97706]">Discount:</span>
                  <span className="font-mono font-semibold text-[#D97706]">-{formatCurrency(totalDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2 font-bold text-[#D97706] border-t border-[#E2E8F0] pt-1">
                <span className="text-[#D97706]">Total:</span>
                <span className="font-mono text-[#D97706] font-bold">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[#15803D] font-bold">
                <span className="text-[#15803D]">Paid:</span>
                <span className="font-mono font-bold text-[#15803D]">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[#DC2626] font-bold">
                <span className="text-[#DC2626]">Owing:</span>
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