// src/components/rentals/RentalSummaryCards.tsx
import React from 'react';
import { 
  Calendar, 
  Clock, 
  FileText, 
  TrendingUp // New icon for Weekly
} from 'lucide-react';
import { Rental, Vehicle } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { isAfter } from 'date-fns';
import { calculateOverdueCost } from '../../utils/rentalCalculations';

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

const emptyTotals: Totals = {
  count: 0,
  net: 0,
  vat: 0,
  discount: 0,
  ongoing: 0,
  returnCharges: 0,
  total: 0,
  paid: 0,
  owing: 0,
};

interface Props {
  rentals: Rental[];
  vehicles?: Vehicle[];
}

const RentalSummaryCards: React.FC<Props> = ({ rentals, vehicles = [] }) => {
  const { formatCurrency } = useFormattedDisplay();
  const { can } = usePermissions();
  if (!can('rentals', 'cards')) return null;

  const now = new Date();

  // Logic matches your original file exactly
  const summary = rentals.reduce(
    (acc, r) => {
      const bucket = (r.type || 'daily') as Bucket;
      const baseAfterDiscount = Number(r.cost || 0);
      const discount = Number(r.discountAmount || 0);
      const subtotalWithOverallVAT = baseAfterDiscount + discount;

      const net = r.includeVAT ? subtotalWithOverallVAT / 1.2 : subtotalWithOverallVAT;
      const vat = r.includeVAT ? subtotalWithOverallVAT - net : 0;

      const veh = vehicles.find(v => v.id === r.vehicleId);
      const end = r.endDate instanceof Date ? r.endDate : new Date(r.endDate);
      const ongoing =
        r.status === 'active' && veh && isAfter(now, end)
          ? calculateOverdueCost(r, now, veh)
          : 0;

      const returnCharges = Number(r.returnCondition?.totalCharges || 0);
      const total = baseAfterDiscount + ongoing + returnCharges;
      const paid = Number(r.paidAmount || 0);
      const owing = total - paid;

      if (!acc.byType[bucket]) acc.byType[bucket] = { ...emptyTotals };

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

      return acc;
    },
    {
      byType: {} as Record<Bucket, Totals>,
      status: { active: 0, scheduled: 0, completed: 0 },
    }
  );

  const SummaryCard = ({ 
    label, 
    icon, 
    totals, 
    colorClass 
  }: { 
    label: string, 
    icon: React.ReactNode, 
    totals?: Totals, 
    colorClass: string 
  }) => {
    const d = totals ?? emptyTotals;
    
    return (
      <div className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6 border-l-4 ${colorClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{d.count}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded-full">
            {icon}
          </div>
        </div>

        {/* Content - EXACTLY matching your original text calculation display */}
        <div className="mt-3 space-y-1 text-sm border-t pt-3 border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-600">Net:</span>
            <span className="font-medium">{formatCurrency(d.net)}</span>
          </div>

          <div className="flex justify-between text-blue-600">
            <span>VAT:</span>
            <span className="font-medium">{formatCurrency(d.vat)}</span>
          </div>

          {d.discount > 0 && (
            <div className="flex justify-between text-purple-600">
              <span>Discount:</span>
              <span className="font-medium">-{formatCurrency(d.discount)}</span>
            </div>
          )}

          {d.ongoing > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Ongoing (Overdue):</span>
              <span className="font-medium">{formatCurrency(d.ongoing)}</span>
            </div>
          )}

          {d.returnCharges > 0 && (
            <div className="flex justify-between text-orange-700">
              <span>Return Charges:</span>
              <span className="font-medium">{formatCurrency(d.returnCharges)}</span>
            </div>
          )}

          <div className="border-t my-2 border-gray-100" />

          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total:</span>
            <span>{formatCurrency(d.total)}</span>
          </div>

          <div className="flex justify-between text-green-700">
            <span>Paid:</span>
            <span className="font-bold">{formatCurrency(d.paid)}</span>
          </div>

          <div className="flex justify-between text-amber-600">
            <span>Owing:</span>
            <span className="font-bold">{formatCurrency(d.owing)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <SummaryCard 
        label="Daily Rentals" 
        icon={<Calendar className="h-6 w-6 text-blue-500" />} 
        totals={summary.byType.daily}
        colorClass="border-blue-500"
      />
      <SummaryCard 
        label="Weekly Rentals" 
        icon={<TrendingUp className="h-6 w-6 text-green-500" />} 
        totals={summary.byType.weekly}
        colorClass="border-green-500"
      />
      <SummaryCard 
        label="Claim Rentals" 
        icon={<FileText className="h-6 w-6 text-purple-500" />} 
        totals={summary.byType.claim}
        colorClass="border-purple-500"
      />

      {/* Status Card */}
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6 border-l-4 border-orange-500">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rental Status</p>
          <div className="p-2 bg-gray-50 rounded-full">
            <Clock className="h-6 w-6 text-orange-500" />
          </div>
        </div>
        <div className="space-y-3 text-sm mt-4">
          <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
            <span className="text-blue-700 font-medium">Active</span>
            <span className="font-bold text-blue-800 text-lg">{summary.status.active}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
            <span className="text-yellow-700 font-medium">Scheduled</span>
            <span className="font-bold text-yellow-800 text-lg">{summary.status.scheduled}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-green-50 rounded">
            <span className="text-green-700 font-medium">Completed</span>
            <span className="font-bold text-green-800 text-lg">{summary.status.completed}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalSummaryCards;