// src/components/rentals/RentalSummaryCards.tsx
import React from 'react';
import { Calendar, Clock, FileText } from 'lucide-react';
import { Rental, Vehicle } from '../../types';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { usePermissions } from '../../hooks/usePermissions';
import { isAfter } from 'date-fns';
import { calculateOverdueCost } from '../../utils/rentalCalculations';

type Bucket = 'daily' | 'weekly' | 'claim';

type Totals = {
  count: number;
  // breakdown for the base block (base+extras with/without overall VAT) BEFORE adding overdue/return
  net: number;
  vat: number;
  discount: number;

  // add-ons
  ongoing: number;
  returnCharges: number;

  // roll-ups
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

  // Align with table logic:
  // - r.cost  = (base + extras [+ overall VAT if includeVAT]) - discount
  // - Add overdue (ongoing) charges and return charges on top of r.cost
  // - For Net/VAT breakdown on the card, reconstruct from (r.cost + r.discountAmount)
  const summary = rentals.reduce(
    (acc, r) => {
      const bucket = (r.type || 'daily') as Bucket;

      // 1) Base AFTER discount (stored)
      const baseAfterDiscount = Number(r.cost || 0);

      // 2) For Net/VAT lines on the card we need the pre-discount, post-overall-VAT subtotal:
      const discount = Number(r.discountAmount || 0);
      const subtotalWithOverallVAT = baseAfterDiscount + discount;

      // Derive Net & VAT exactly like the table/modals
      const net = r.includeVAT ? subtotalWithOverallVAT / 1.2 : subtotalWithOverallVAT;
      const vat = r.includeVAT ? subtotalWithOverallVAT - net : 0;

      // 3) Ongoing (overdue) charges (VAT-inclusive from util). Needs vehicle to compute accurately.
      const veh = vehicles.find(v => v.id === r.vehicleId);
      const end = r.endDate instanceof Date ? r.endDate : new Date(r.endDate);
      const ongoing =
        r.status === 'active' && veh && isAfter(now, end)
          ? calculateOverdueCost(r, now, veh)
          : 0;

      // 4) Return charges (already VAT-inclusive in your flow)
      const returnCharges = Number(r.returnCondition?.totalCharges || 0);

      // 5) Totals
      const total = baseAfterDiscount + ongoing + returnCharges;
      const paid = Number(r.paidAmount || 0);
      const owing = total - paid;

      // ensure bucket exists
      if (!acc.byType[bucket]) acc.byType[bucket] = { ...emptyTotals };

      // bump bucket sums
      acc.byType[bucket].count += 1;
      acc.byType[bucket].net += net;
      acc.byType[bucket].vat += vat;
      acc.byType[bucket].discount += discount;
      acc.byType[bucket].ongoing += ongoing;
      acc.byType[bucket].returnCharges += returnCharges;
      acc.byType[bucket].total += total;
      acc.byType[bucket].paid += paid;
      acc.byType[bucket].owing += owing;

      // status counters
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

  const card = (label: string, icon: React.ReactNode, t?: Totals) => {
    const d = t ?? emptyTotals;
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{d.count}</p>
          </div>
          {icon}
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Net:</span>
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
            <div className="flex justify-between">
              <span>Return Charges:</span>
              <span className="font-medium">{formatCurrency(d.returnCharges)}</span>
            </div>
          )}

          <div className="border-t my-1" />

          <div className="flex justify-between font-semibold">
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
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {card('Daily Rentals', <Calendar className="h-10 w-10 text-blue-500" />, summary.byType.daily)}
      {card('Weekly Rentals', <Calendar className="h-10 w-10 text-green-500" />, summary.byType.weekly)}
      {card('Claim Rentals', <FileText className="h-10 w-10 text-purple-500" />, summary.byType.claim)}

      {/* Rental Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-500">Rental Status</p>
          <Clock className="h-10 w-10 text-orange-500" />
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-600">Active:</span>
            <span className="font-medium">{summary.status.active}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-yellow-600">Scheduled:</span>
            <span className="font-medium">{summary.status.scheduled}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600">Completed:</span>
            <span className="font-medium">{summary.status.completed}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalSummaryCards;
