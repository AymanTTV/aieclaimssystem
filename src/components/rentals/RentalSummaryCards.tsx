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
  rentals?: Rental[];
  vehicles?: Vehicle[];
}

interface SummaryCardProps {
  label?: string;
  icon?: React.ReactNode;
  totals?: Partial<Totals>;
  bgClass?: string;
  borderClass?: string;
  accentClass?: string;
}

const RentalSummaryCards: React.FC<Props> = ({ rentals = [], vehicles = [] }) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();
  
  const summary = useMemo(() => {
    const summaryResult = {
      byType: {
        daily: emptyTotals(),
        weekly: emptyTotals(),
        claim: emptyTotals(),
      },
      status: {
        active: 0,
        scheduled: 0,
        completed: 0,
      },
    };

    const now = new Date();

    if (!Array.isArray(rentals)) {
      return summaryResult;
    }

    const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

    rentals.forEach((r) => {
      if (!r || typeof r !== 'object') return;

      const rawType = String(r?.type || '').trim().toLowerCase();
      let bucket: Bucket = 'daily';
      if (rawType.includes('claim') || rawType === 'credit_hire') {
        bucket = 'claim';
      } else if (rawType.includes('week')) {
        bucket = 'weekly';
      } else {
        bucket = 'daily';
      }

      if (!summaryResult.byType[bucket]) {
        summaryResult.byType[bucket] = emptyTotals();
      }
      const targetBucket = summaryResult.byType[bucket] || emptyTotals();
      summaryResult.byType[bucket] = targetBucket;

      const veh = safeVehicles.find((v) => v && v?.id === r?.vehicleId);
      
      let net = 0, vat = 0, gross = 0, discount = 0, ongoing = 0, returnCharges = 0, total = 0, paid = 0, owing = 0;

      try {
        if (veh && r?.startDate && r?.endDate) {
          const start = ensureValidDate(r.startDate);
          const end = ensureValidDate(r.endDate);
          const storageNet = r?.type === 'claim' ? (Number(r?.storageDays) || 0) * (Number(r?.storageCostPerDay) || 0) : 0;
          
          // Aggregate extra charges safely with unique parameter name and optional chaining
          const extraTotal = Array.isArray(r?.extraCharges)
            ? r.extraCharges.reduce((chargeSum, c) => chargeSum + (Number(c?.amount) || 0), 0)
            : 0;

          const details = calculateRentalCostDetailed(
            start, end, r?.type, veh, r?.reason, r?.negotiatedRate ?? undefined,
            storageNet,
            r?.type === 'claim' ? (Number(r?.recoveryCost) || 0) : 0,
            Number(r?.deliveryCharge) || 0, Number(r?.collectionCharge) || 0,
            r?.type !== 'weekly' ? (Number(r?.insurancePerDay) || 0) : 0,
            r?.type === 'weekly' ? (Number((r as any)?.insurancePerWeek) || 0) : 0,
            Boolean(r?.includeVAT), Boolean(r?.deliveryChargeIncludeVAT), Boolean(r?.collectionChargeIncludeVAT),
            Boolean(r?.insurancePerDayIncludeVAT), Boolean((r as any)?.insurancePerWeekIncludeVAT), Boolean(r?.includeRecoveryCostVAT), Boolean(r?.includeStorageVAT),
            Number(r?.discountPercentage) || 0, Number(r?.discountAmount) || 0, r?.status,
            r?.lockedDailyRate, r?.lockedWeeklyRate, r?.lockedClaimRate,
            extraTotal,
            Array.isArray(r?.discounts) ? r.discounts : []
          );

          net = Number(details?.net) || 0;
          vat = Number(details?.vat) || 0;
          gross = Number(details?.gross) || 0;
          discount = Number(details?.discountAmount) || 0;

          if (r?.status === 'active' && isAfter(now, end)) {
            ongoing = Number(calculateOverdueCost(r, now, veh)) || 0;
          }

          returnCharges = (Number(r?.returnCondition?.totalCharges) || 0) + (Number(calculateTotalSubstitutionCharges(r)) || 0);
          
          total = gross + ongoing + returnCharges;
          paid = Number(r?.paidAmount) || 0;
          owing = total - paid;
        } else {
          total = Number(r?.cost) || 0;
          paid = Number(r?.paidAmount) || 0;
          owing = total - paid;
        }
      } catch (calcErr) {
        console.error('Error calculating rental cost for summary card:', calcErr);
        total = Number(r?.cost) || 0;
        paid = Number(r?.paidAmount) || 0;
        owing = total - paid;
      }

      if (targetBucket) {
        targetBucket.count = (targetBucket.count || 0) + 1;
        targetBucket.net += (net || 0);
        targetBucket.vat += (vat || 0);
        targetBucket.discount += (discount || 0);
        targetBucket.ongoing += (ongoing || 0);
        targetBucket.returnCharges += (returnCharges || 0);
        targetBucket.total += (total || 0);
        targetBucket.paid += (paid || 0);
        targetBucket.owing += (owing || 0);
      }

      const statusLower = String(r?.status || '').toLowerCase();
      if (statusLower === 'active') summaryResult.status.active += 1;
      else if (statusLower === 'scheduled') summaryResult.status.scheduled += 1;
      else if (statusLower === 'completed') summaryResult.status.completed += 1;
    });

    return summaryResult;
  }, [rentals, vehicles]);

  if (typeof can === 'function' && !can('rentals', 'cards')) return null;

  const SummaryCard: React.FC<SummaryCardProps> = ({ 
    label = '', 
    icon = null, 
    totals = emptyTotals(), 
    bgClass = 'bg-white', 
    borderClass = 'border-slate-200', 
    accentClass = 'text-slate-800' 
  }) => {
    const d = totals || emptyTotals();
    const countVal = d?.count ?? 0;
    const netVal = d?.net ?? 0;
    const discountVal = d?.discount ?? 0;
    const vatVal = d?.vat ?? 0;
    const ongoingVal = d?.ongoing ?? 0;
    const returnChargesVal = d?.returnCharges ?? 0;
    const totalVal = d?.total ?? 0;
    const paidVal = d?.paid ?? 0;
    const owingVal = d?.owing ?? 0;

    return (
      <div
        className={`${bgClass} ${borderClass} rounded-2xl shadow-xs transition-all duration-200 p-6 relative overflow-hidden flex flex-col justify-between`}
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="flex items-center justify-between mb-4 relative z-10">
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${accentClass}`}>{label}</p>
            <p className={`mt-1 text-4xl font-black font-mono tracking-tight ${accentClass}`}>{countVal}</p>
          </div>
          <div className={`p-3 rounded-xl border ${borderClass} bg-white shadow-xs ${accentClass}`}>
            {icon}
          </div>
        </div>

        <div className="space-y-1.5 text-sm border-t pt-4 border-slate-200/80 relative z-10">
          {/* 1. Base Net: #000000, font-weight: 600 */}
          <div className="flex justify-between items-center text-[#000000]">
             <span className="font-semibold text-[#000000]">Base Net:</span>
             <span className="font-mono font-semibold text-[#000000]">{formatCurrency((netVal || 0) + (discountVal || 0))}</span>
          </div>

          {/* 2. Discount */}
          {discountVal > 0 && (
             <div className="flex justify-between items-center text-[#D97706]">
                <span className="font-semibold text-[#D97706]">Discount:</span>
                <span className="font-mono font-semibold text-[#D97706]">-{formatCurrency(discountVal)}</span>
             </div>
          )}

          {/* 3. VAT: #2563EB, font-weight: 600 */}
          <div className="flex justify-between items-center text-[#2563EB]">
             <span className="font-semibold text-[#2563EB]">VAT:</span>
             <span className="font-mono font-semibold text-[#2563EB]">{formatCurrency(vatVal || 0)}</span>
          </div>

          {/* Extras */}
          {ongoingVal > 0 && (
            <div className="flex justify-between items-center text-[#DC2626]">
              <span className="font-semibold text-[#DC2626]">Overdue:</span>
              <span className="font-mono font-semibold text-[#DC2626]">{formatCurrency(ongoingVal)}</span>
            </div>
          )}
          {returnChargesVal > 0 && (
            <div className="flex justify-between items-center text-[#DC2626]">
              <span className="font-semibold text-[#DC2626]">Penalties:</span>
              <span className="font-mono font-semibold text-[#DC2626]">{formatCurrency(returnChargesVal)}</span>
            </div>
          )}
          
          {/* Totals */}
          <div className="border-t my-2 border-slate-200/80" />
          {/* Gross Total: #D97706, font-weight: 700 */}
          <div className="flex justify-between items-center font-bold text-[#D97706]">
            <span className="text-[#D97706]">Gross Total:</span>
            <span className="font-mono text-[#D97706] text-base font-bold">{formatCurrency(totalVal || 0)}</span>
          </div>
          {/* Paid: #15803D, font-weight: 700 */}
          <div className="flex justify-between items-center text-[#15803D] font-bold">
            <span className="text-[#15803D]">Paid:</span>
            <span className="font-mono text-[#15803D] font-bold">{formatCurrency(paidVal || 0)}</span>
          </div>
          {/* Owing: #DC2626, font-weight: 700 */}
          <div className="flex justify-between items-center text-[#DC2626] font-bold">
            <span className="text-[#DC2626]">Owing:</span>
            <span className="font-mono text-[#DC2626] font-bold">{formatCurrency(owingVal || 0)}</span>
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
        totals={summary?.byType?.daily ?? emptyTotals()}
        bgClass="bg-[#EFF6FF]"
        borderClass="border-[#BFDBFE]"
        accentClass="text-[#1D4ED8]"
      />
      <SummaryCard 
        label="Weekly Rentals" 
        icon={<TrendingUp className="h-6 w-6" />} 
        totals={summary?.byType?.weekly ?? emptyTotals()}
        bgClass="bg-[#ECFDF5]"
        borderClass="border-[#A7F3D0]"
        accentClass="text-[#047857]"
      />
      <SummaryCard 
        label="Claim Rentals" 
        icon={<FileText className="h-6 w-6" />} 
        totals={summary?.byType?.claim ?? emptyTotals()}
        bgClass="bg-[#FFFBEB]"
        borderClass="border-[#FDE68A]"
        accentClass="text-[#B45309]"
      />

      {/* Status Dashboard - Fleet Status Card */}
      <div
        className="bg-white rounded-2xl shadow-xs p-5 sm:p-6 text-[#0F172A] relative overflow-hidden border border-[#E2E8F0] flex flex-col justify-between"
        style={{ borderWidth: '1.5px', borderStyle: 'solid' }}
      >
        <div className="flex items-center justify-between mb-5 relative z-10">
          <p className="text-xs font-extrabold text-[#64748B] uppercase tracking-widest font-mono">
            Fleet Status
          </p>
          <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl shadow-xs">
            <Clock className="h-5 w-5 text-[#64748B]" />
          </div>
        </div>
        <div className="space-y-3 relative z-10">
          <div className="flex justify-between items-center bg-[#DCFCE7] border border-[#86EFAC] p-3.5 rounded-xl transition-all duration-150 shadow-xs">
            <span className="text-[#15803D] font-bold text-sm tracking-wide">Active on Hire</span>
            <span className="font-mono font-black text-[#15803D] text-2xl tracking-tight">
              {summary?.status?.active ?? 0}
            </span>
          </div>
          <div className="flex justify-between items-center bg-[#FEF3C7] border border-[#FDE68A] p-3.5 rounded-xl transition-all duration-150 shadow-xs">
            <span className="text-[#B45309] font-bold text-sm tracking-wide">Scheduled</span>
            <span className="font-mono font-black text-[#B45309] text-2xl tracking-tight">
              {summary?.status?.scheduled ?? 0}
            </span>
          </div>
          <div className="flex justify-between items-center bg-[#E0F2FE] border border-[#BAE6FD] p-3.5 rounded-xl transition-all duration-150 shadow-xs">
            <span className="text-[#0369A1] font-bold text-sm tracking-wide">Completed</span>
            <span className="font-mono font-black text-[#0369A1] text-2xl tracking-tight">
              {summary?.status?.completed ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalSummaryCards;