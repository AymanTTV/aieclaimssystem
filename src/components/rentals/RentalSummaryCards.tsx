// src/components/rentals/RentalSummaryCards.tsx
import React, { useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  FileText, 
  TrendingUp,
  Receipt
} from 'lucide-react';
import { Rental, Vehicle } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { isAfter } from 'date-fns';
import { 
  calculateRentalCostDetailed, 
  calculateOverdueCost, 
  calculateTotalSubstitutionCharges 
} from '../../utils/rentalCalculations';
import { ensureValidDate } from '../../utils/dateHelpers';

type Bucket = 'daily' | 'weekly' | 'claim';

type Totals = {
  count: number;
  net: number;
  vat: number;
  discount: number;
  ongoing: number;
  returnCharges: number;
  total: number;
  paid: number;
  owing: number;
};

const emptyTotals = (): Totals => ({
  count: 0, net: 0, vat: 0, discount: 0, ongoing: 0, returnCharges: 0, total: 0, paid: 0, owing: 0,
});

interface Props {
  rentals: Rental[];
  vehicles?: Vehicle[];
}

const RentalSummaryCards: React.FC<Props> = ({ rentals, vehicles = [] }) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();
  
  const summary = useMemo(() => {
    const acc = {
      byType: { daily: emptyTotals(), weekly: emptyTotals(), claim: emptyTotals() },
      status: { active: 0, scheduled: 0, completed: 0 },
    };

    const now = new Date();

    rentals.forEach((r) => {
      const bucket = (r.type || 'daily') as Bucket;
      const veh = vehicles.find(v => v.id === r.vehicleId);
      
      let net = 0, vat = 0, gross = 0, discount = 0, ongoing = 0, returnCharges = 0, total = 0, paid = 0, owing = 0;

      if (veh && r.startDate && r.endDate) {
        const start = ensureValidDate(r.startDate);
        const end = ensureValidDate(r.endDate);
        const storageNet = r.type === 'claim' ? (r.storageDays || 0) * (r.storageCostPerDay || 0) : 0;
        
        // ✅ FIX: Aggregate extra charges to pass to the engine
        const extraTotal = (r.extraCharges || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

        const details = calculateRentalCostDetailed(
          start, end, r.type, veh, r.reason, r.negotiatedRate ?? undefined,
          storageNet,
          r.type === 'claim' ? (r.recoveryCost || 0) : 0,
          r.deliveryCharge || 0, r.collectionCharge || 0,
          r.type !== 'weekly' ? (r.insurancePerDay || 0) : 0,
          r.type === 'weekly' ? ((r as any).insurancePerWeek || 0) : 0,
          r.includeVAT || false, r.deliveryChargeIncludeVAT || false, r.collectionChargeIncludeVAT || false,
          r.insurancePerDayIncludeVAT || false, (r as any).insurancePerWeekIncludeVAT || false, r.includeRecoveryCostVAT || false, r.includeStorageVAT || false,
          r.discountPercentage || 0, r.discountAmount || 0, r.status,
          r.lockedDailyRate, r.lockedWeeklyRate, r.lockedClaimRate,
          extraTotal, // 👈 PASSED HERE
          r.discounts || [] // 👈 PASSED HERE
        );

        net = details.net;
        vat = details.vat;
        gross = details.gross;
        discount = details.discountAmount;

        if (r.status === 'active' && isAfter(now, end)) {
          ongoing = calculateOverdueCost(r, now, veh);
        }

        returnCharges = (r.returnCondition?.totalCharges ?? 0) + calculateTotalSubstitutionCharges(r);
        
        total = gross + ongoing + returnCharges;
        paid = r.paidAmount || 0;
        owing = total - paid;
      } else {
        total = r.cost || 0;
        paid = r.paidAmount || 0;
        owing = total - paid;
      }

      acc.byType[bucket].count += 1;
      acc.byType[bucket].net += net;
      acc.byType[bucket].vat += vat;
      acc.byType[bucket].discount += discount;
      acc.byType[bucket].ongoing += ongoing;
      acc.byType[bucket].returnCharges += returnCharges;
      acc.byType[bucket].total += total;
      acc.byType[bucket].paid += paid;
      acc.byType[bucket].owing += owing;

      if (r.status === 'active') acc.status.active += 1;
      if (r.status === 'scheduled') acc.status.scheduled += 1;
      if (r.status === 'completed') acc.status.completed += 1;
    });

    return acc;
  }, [rentals, vehicles]);

  if (!can('rentals', 'cards')) return null;

  const SummaryCard = ({ label, icon, totals, labelColor, iconWrapperClass }: any) => {
    const d = totals;
    return (
      <div className="bg-[#16192B] rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 p-6 border border-[#2B314E] hover:border-[#3D456E] relative overflow-hidden group text-white flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${labelColor}`}>{label}</p>
            <p className="mt-1 text-4xl font-black text-white font-mono tracking-tight">{d.count}</p>
          </div>
          <div className={`p-3 rounded-xl border shadow-xs ${iconWrapperClass}`}>
            {icon}
          </div>
        </div>

        <div className="space-y-1.5 text-sm border-t pt-4 border-slate-800/80 relative z-10">
          {/* 1. Base Net */}
          <div className="flex justify-between items-center">
             <span className="text-slate-300 font-medium">Base Net:</span>
             <span className="font-mono text-white">{formatCurrency(d.net + d.discount)}</span>
          </div>

          {/* 2. Discount */}
          {d.discount > 0 && (
             <div className="flex justify-between items-center">
                <span className="text-purple-400 font-medium">Discount:</span>
                <span className="font-mono text-purple-300">-{formatCurrency(d.discount)}</span>
             </div>
          )}

          {/* 3. VAT */}
          <div className="flex justify-between items-center">
             <span className="text-blue-400 font-medium">VAT:</span>
             <span className="font-mono text-blue-300">{formatCurrency(d.vat)}</span>
          </div>

          {/* Extras */}
          {d.ongoing > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-rose-400 font-medium">Overdue:</span>
              <span className="font-mono text-rose-300">{formatCurrency(d.ongoing)}</span>
            </div>
          )}
          {d.returnCharges > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-amber-400 font-medium">Penalties:</span>
              <span className="font-mono text-amber-300">{formatCurrency(d.returnCharges)}</span>
            </div>
          )}
          
          {/* Totals */}
          <div className="border-t my-2 border-slate-800/80" />
          <div className="flex justify-between items-center font-bold text-slate-100">
            <span>Gross Total:</span>
            <span className="font-mono text-white text-base">{formatCurrency(d.total)}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400 font-medium">
            <span>Paid:</span>
            <span className="font-mono text-emerald-300">{formatCurrency(d.paid)}</span>
          </div>
          <div className="flex justify-between items-center text-amber-400 font-bold">
            <span>Owing:</span>
            <span className="font-mono text-amber-300">{formatCurrency(d.owing)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <SummaryCard 
        label="Daily Rentals" 
        icon={<Calendar className="h-6 w-6" />} 
        totals={summary.byType.daily}
        labelColor="text-blue-300"
        iconWrapperClass="bg-blue-500/15 border-blue-500/30 text-blue-400"
      />
      <SummaryCard 
        label="Weekly Rentals" 
        icon={<TrendingUp className="h-6 w-6" />} 
        totals={summary.byType.weekly}
        labelColor="text-emerald-300"
        iconWrapperClass="bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
      />
      <SummaryCard 
        label="Claim Rentals" 
        icon={<FileText className="h-6 w-6" />} 
        totals={summary.byType.claim}
        labelColor="text-purple-300"
        iconWrapperClass="bg-purple-500/15 border-purple-500/30 text-purple-400"
      />

      {/* Status Dashboard - Dynamic Standout Fleet Status Card */}
      <div className="bg-[#16192B] rounded-2xl shadow-xl p-5 sm:p-6 text-white relative overflow-hidden border border-[#2B314E] hover:border-[#3D456E] flex flex-col justify-between">
        <Receipt className="absolute -right-3 -bottom-5 w-36 h-36 text-white/[0.04] pointer-events-none select-none" />
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
              {summary.status.active}
            </span>
          </div>
          <div className="flex justify-between items-center bg-[#28220e] border border-amber-500/40 hover:border-amber-400/70 p-3.5 rounded-xl transition-all duration-150 shadow-sm">
            <span className="text-amber-300 font-bold text-sm tracking-wide">Scheduled</span>
            <span className="font-mono font-black text-amber-100 text-2xl tracking-tight">
              {summary.status.scheduled}
            </span>
          </div>
          <div className="flex justify-between items-center bg-[#0d261b] border border-emerald-500/40 hover:border-emerald-400/70 p-3.5 rounded-xl transition-all duration-150 shadow-sm">
            <span className="text-emerald-300 font-bold text-sm tracking-wide">Completed</span>
            <span className="font-mono font-black text-emerald-100 text-2xl tracking-tight">
              {summary.status.completed}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalSummaryCards;