import React from 'react';
import { Rental } from '../../types';
import { Clock, Receipt } from 'lucide-react';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';

interface RentalOverviewProps {
  rentals: Rental[];
}

const RentalOverview: React.FC<RentalOverviewProps> = ({ rentals }) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();
  const { user } = useAuth();

  // Hide if they do not have the permission to view the rental page
  if (!can('rentals', 'view')) {
    return null;
  }

  const completedCount = rentals.filter(rental => rental.status === 'completed').length;
  const activeCount = rentals.filter(rental => rental.status === 'active').length;
  const scheduledCount = rentals.filter(rental => rental.status === 'scheduled').length;
  const totalIncome = rentals.reduce((sum, rental) => sum + rental.cost, 0);

  return (
    <div className="bg-[#0c101c] rounded-2xl shadow-xl p-5 sm:p-6 text-white relative overflow-hidden border border-slate-800/90 flex flex-col justify-between h-full">
      <Receipt className="absolute -right-3 -bottom-5 w-36 h-36 text-white/[0.04] pointer-events-none select-none" />
      <div>
        <div className="flex items-center justify-between mb-5 relative z-10">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest font-mono">
            Fleet Status
          </p>
          <div className="p-2 bg-slate-800/80 border border-slate-700/60 rounded-xl shadow-xs">
            <Clock className="h-5 w-5 text-slate-100" />
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <div className="flex justify-between items-center bg-[#101e38] border border-blue-500/40 hover:border-blue-400/70 p-3.5 rounded-xl transition-all duration-150 shadow-sm">
            <span className="text-blue-300 font-bold text-sm tracking-wide">Active on Hire</span>
            <span className="font-mono font-black text-white text-2xl tracking-tight">
              {activeCount}
            </span>
          </div>

          <div className="flex justify-between items-center bg-[#28220e] border border-amber-500/40 hover:border-amber-400/70 p-3.5 rounded-xl transition-all duration-150 shadow-sm">
            <span className="text-amber-300 font-bold text-sm tracking-wide">Scheduled</span>
            <span className="font-mono font-black text-amber-100 text-2xl tracking-tight">
              {scheduledCount}
            </span>
          </div>

          <div className="flex justify-between items-center bg-[#0d261b] border border-emerald-500/40 hover:border-emerald-400/70 p-3.5 rounded-xl transition-all duration-150 shadow-sm">
            <span className="text-emerald-300 font-bold text-sm tracking-wide">Completed</span>
            <span className="font-mono font-black text-emerald-100 text-2xl tracking-tight">
              {completedCount}
            </span>
          </div>
        </div>
      </div>

      {user?.role === 'manager' && (
        <div className="pt-4 mt-4 border-t border-slate-800/80 relative z-10 flex justify-between items-center">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Income</span>
          <span className="text-base font-bold text-white font-mono">
            {formatCurrency(totalIncome)}
          </span>
        </div>
      )}
    </div>
  );
};

export default RentalOverview;