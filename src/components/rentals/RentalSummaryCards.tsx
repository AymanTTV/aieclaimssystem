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

  const SummaryCard = ({ label, icon, totals, colorClass, bgIconClass, textIconClass }: any) => {
    const d = totals;
    return (
      <div className={`bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-100 relative overflow-hidden group`}>
        <div className={`absolute top-0 right-0 w-24 h-24 ${bgIconClass} opacity-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />
        
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="mt-1 text-4xl font-black text-gray-900">{d.count}</p>
          </div>
          <div className={`p-3 rounded-xl ${bgIconClass} ${textIconClass} shadow-sm`}>
            {icon}
          </div>
        </div>

        <div className="space-y-1.5 text-sm border-t pt-4 border-gray-100 relative z-10">
          {/* 1. Base Net (We add the discount back here just for display purposes so the math visually adds up) */}
          <div className="flex justify-between">
             <span className="text-gray-500 font-medium">Base Net:</span>
             <span className="font-mono">{formatCurrency(d.net + d.discount)}</span>
          </div>

          {/* 2. Discount is subtracted from the Base Net */}
          {d.discount > 0 && (
             <div className="flex justify-between">
                <span className="text-purple-500 font-medium">Discount:</span>
                <span className="font-mono text-purple-600">-{formatCurrency(d.discount)}</span>
             </div>
          )}

          {/* 3. VAT is calculated ON the discounted net */}
          <div className="flex justify-between">
             <span className="text-blue-500 font-medium">VAT (Post-Discount):</span>
             <span className="font-mono text-blue-600">{formatCurrency(d.vat)}</span>
          </div>

          {/* Extras */}
          {d.ongoing > 0 && <div className="flex justify-between"><span className="text-red-500 font-medium">Overdue:</span><span className="font-mono text-red-600">{formatCurrency(d.ongoing)}</span></div>}
          {d.returnCharges > 0 && <div className="flex justify-between"><span className="text-orange-500 font-medium">Penalties:</span><span className="font-mono text-orange-600">{formatCurrency(d.returnCharges)}</span></div>}
          
          {/* Totals */}
          <div className="border-t my-2 border-gray-100" />
          <div className="flex justify-between font-bold text-gray-900"><span>Gross Total:</span><span className="font-mono">{formatCurrency(d.total)}</span></div>
          <div className="flex justify-between text-green-600 font-medium"><span>Paid:</span><span className="font-mono">{formatCurrency(d.paid)}</span></div>
          <div className="flex justify-between text-amber-600 font-bold"><span>Owing:</span><span className="font-mono">{formatCurrency(d.owing)}</span></div>
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
        colorClass="border-blue-500" bgIconClass="bg-blue-50" textIconClass="text-blue-600"
      />
      <SummaryCard 
        label="Weekly Rentals" 
        icon={<TrendingUp className="h-6 w-6" />} 
        totals={summary.byType.weekly}
        colorClass="border-emerald-500" bgIconClass="bg-emerald-50" textIconClass="text-emerald-600"
      />
      <SummaryCard 
        label="Claim Rentals" 
        icon={<FileText className="h-6 w-6" />} 
        totals={summary.byType.claim}
        colorClass="border-purple-500" bgIconClass="bg-purple-50" textIconClass="text-purple-600"
      />

      {/* Status Dashboard */}
      <div className="bg-gray-900 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
        <Receipt className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5" />
        <div className="flex items-center justify-between mb-6 relative z-10">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fleet Status</p>
          <div className="p-2 bg-white/10 rounded-xl">
            <Clock className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="space-y-4 relative z-10">
          <div className="flex justify-between items-center bg-blue-500/20 border border-blue-500/30 p-3 rounded-xl">
            <span className="text-blue-200 font-bold text-sm">Active on Hire</span>
            <span className="font-black text-blue-100 text-xl">{summary.status.active}</span>
          </div>
          <div className="flex justify-between items-center bg-yellow-500/20 border border-yellow-500/30 p-3 rounded-xl">
            <span className="text-yellow-200 font-bold text-sm">Scheduled</span>
            <span className="font-black text-yellow-100 text-xl">{summary.status.scheduled}</span>
          </div>
          <div className="flex justify-between items-center bg-green-500/20 border border-green-500/30 p-3 rounded-xl">
            <span className="text-green-200 font-bold text-sm">Completed</span>
            <span className="font-black text-green-100 text-xl">{summary.status.completed}</span>
          </div>
        </div>
          
      </div>
    </div>
  );
};

export default RentalSummaryCards;