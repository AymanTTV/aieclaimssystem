// src/components/rentals/RentalTable.tsx
import React, { useMemo, useCallback } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Rental, Vehicle, Customer } from '../../types';
import {
  Eye,
  Pencil,
  Trash2,
  FileSignature,
  Receipt,
  CheckCircle2,
  CreditCard,
  Percent,
  CalendarClock,
  FileText,
  Clock,
  Car,
  ArrowRightLeft,
  AlertTriangle,
  StickyNote,
  AlertCircle,
  CalendarPlus 
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate, ensureValidDate } from '../../utils/dateHelpers';
import {
  isAfter,
  differenceInHours,
  isWithinInterval,
  addDays,
  isBefore,
  isValid,
} from 'date-fns';
import {
  calculateOverdueCost,
  RENTAL_RATES,
  getOverdueUnits,
  calculateRentalCostDetailed,
  calculateTotalSubstitutionCharges
} from '../../utils/rentalCalculations';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';

// statuses that DO NOT accrue ongoing charges
const INACTIVE_STATUSES = new Set(['completed', 'complete', 'returned', 'cancelled']);

type UrgencyLevel = 'red' | 'yellow' | 'none';

interface RentalTableProps {
  rentals: Rental[];
  vehicles: Vehicle[];
  customers: Customer[];
  onView: (rental: Rental) => void;
  onEdit: (rental: Rental) => void;
  onDelete: (rental: Rental) => void;
  onComplete: (rental: Rental) => void;
  onDownloadAgreement: (rental: Rental) => void;
  onDownloadInvoice: (rental: Rental) => void;
  onRecordPayment: (rental: Rental) => void;
  onApplyDiscount: (rental: Rental) => void;
  onDeletePayment: (rental: Rental, paymentId: string) => void;
  onShowNotes: (rental: Rental) => void;
  onGenerate90DayAgreement?: (rental: Rental) => void;
  onDownloadPermit?: (rental: Rental) => void;
  onSetReturnExpectation?: (rental: Rental) => void;
  onExtend: (rental: Rental) => void;
}

const RentalTable: React.FC<RentalTableProps> = ({
  rentals,
  vehicles,
  customers,
  onView,
  onEdit,
  onDelete,
  onComplete,
  onDownloadAgreement,
  onDownloadInvoice,
  onRecordPayment,
  onApplyDiscount,
  onDeletePayment,
  onShowNotes,
  onGenerate90DayAgreement,
  onDownloadPermit,
  onSetReturnExpectation,
  onExtend,
}) => {
  const { can } = usePermissions();
  const { user } = useAuth(); 
  const { formatCurrency } = useFormattedDisplay();

  // --- CENTRALIZED COST HELPER FOR TABLE ---
  const getDetailedRentalTotals = useCallback((rental: Rental, vehicle?: Vehicle) => {
    if (!vehicle) return { detailedCosts: { net: 0, vat: 0, gross: 0, discountAmount: 0 }, ongoingCharges: 0, returnCharges: 0, totalAmountDue: 0, paid: 0, remaining: 0, extraTotal: 0 };
    
    const start = ensureValidDate(rental.startDate);
    const end = ensureValidDate(rental.endDate);
    const storageNet = rental.type === 'claim' ? (rental.storageDays || 0) * (rental.storageCostPerDay || 0) : 0;

    // ✅ SUM UP EXTRA CHARGES
    const extraTotal = (rental.extraCharges || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    const detailedCosts = calculateRentalCostDetailed(
      start, end, rental.type, vehicle, rental.reason, rental.negotiatedRate ?? undefined,
      storageNet,
      rental.type === 'claim' ? (rental.recoveryCost || 0) : 0,
      rental.deliveryCharge || 0, rental.collectionCharge || 0,
      rental.type !== 'weekly' ? (rental.insurancePerDay || 0) : 0,
      rental.type === 'weekly' ? ((rental as any).insurancePerWeek || 0) : 0,
      rental.includeVAT || false, rental.deliveryChargeIncludeVAT || false, rental.collectionChargeIncludeVAT || false,
      rental.insurancePerDayIncludeVAT || false, (rental as any).insurancePerWeekIncludeVAT || false, rental.includeRecoveryCostVAT || false, rental.includeStorageVAT || false,
      rental.discountPercentage || 0, rental.discountAmount || 0, rental.status,
      rental.lockedDailyRate, rental.lockedWeeklyRate, rental.lockedClaimRate,
      extraTotal, // ✅ ALREADY HERE
      rental.discounts || [] // 👈 ADD THIS
    );

    const now = new Date();
    const ongoingCharges = rental.status === 'active' && isAfter(now, end) ? calculateOverdueCost(rental, now, vehicle) : 0;

    const subCharges = calculateTotalSubstitutionCharges(rental);
    const returnCharges = (rental.returnCondition?.totalCharges ?? 0) + subCharges;

    const totalAmountDue = detailedCosts.gross + ongoingCharges + returnCharges;
    const paid = rental.paidAmount || 0;
    const remaining = totalAmountDue - paid;

    return { detailedCosts, ongoingCharges, returnCharges, totalAmountDue, paid, remaining, extraTotal };
  }, []);

  const getUrgencyLevel = useCallback((r: Rental, remaining: number): UrgencyLevel => {
    if (r.status !== 'active' && r.status !== 'completed') return 'none';
    if (remaining <= 0.01) return 'none';

    const refDate = r.payments && r.payments.length > 0
      ? new Date(Math.max(...r.payments.map((p: any) => new Date(p.date).getTime())))
      : ensureValidDate(r.startDate);
    
    const today = new Date();
    const diffMs = today.getTime() - refDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (r.type === 'weekly' && diffDays >= 7) return 'red';
    if (r.type === 'daily' && diffDays >= 7) return 'red';
    if (r.type === 'claim' && diffDays >= 180) return 'red';

    return 'none'; 
  }, []);

  const sortedRentals = useMemo(() => {
    return [...rentals].sort((a, b) => {
      const vA = vehicles.find(v => v.id === a.vehicleId);
      const vB = vehicles.find(v => v.id === b.vehicleId);
      
      const { remaining: owingA } = getDetailedRentalTotals(a, vA);
      const { remaining: owingB } = getDetailedRentalTotals(b, vB);
      
      if (Math.abs(owingA - owingB) > 0.001) {
        return owingB - owingA;
      }

      const scoreA = getUrgencyLevel(a, owingA) === 'red' ? 3 : getUrgencyLevel(a, owingA) === 'yellow' ? 2 : 1;
      const scoreB = getUrgencyLevel(b, owingB) === 'red' ? 3 : getUrgencyLevel(b, owingB) === 'yellow' ? 2 : 1;
      
      if (scoreA !== scoreB) return scoreB - scoreA;

      return isBefore(a.endDate, b.endDate) ? -1 : 1;
    });
  }, [rentals, vehicles, getDetailedRentalTotals, getUrgencyLevel]);

  const ActionBtn = ({ 
    onClick, 
    icon: Icon, 
    colorClass, 
    title 
  }: { 
    onClick: (e: React.MouseEvent) => void, 
    icon: any, 
    colorClass: string, 
    title: string 
  }) => (
    <button 
      onClick={e => { e.stopPropagation(); onClick(e); }} 
      title={title}
      className={`p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all flex items-center justify-center w-8 h-8 ${colorClass}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }: any) => {
        const r = row.original as Rental;
        const v = vehicles.find(v => v.id === r.vehicleId);
        const subs = r.hireSubstitutionDetails || [];
        const activeSub = subs.find(s => !s.returnCondition);

        return v ? (
          <div className="flex flex-col space-y-2">
            <div>
              {r.rentalAgreementNumber && (
                <div className="mb-1">
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    AGR-{r.rentalAgreementNumber}
                  </span>
                </div>
              )}
              <div className="font-bold text-gray-900">{v.make} {v.model}</div>
              <div className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-700 border border-gray-200 mt-0.5">
                {v.registrationNumber}
              </div>
            </div>
            {activeSub && (activeSub.make || activeSub.model || activeSub.registration) && (
              <div className="pl-2 border-l-2 border-orange-300">
                <div className="text-[10px] uppercase text-orange-700 font-bold mb-0.5">Active Substitute</div>
                <div className="font-bold text-sm text-gray-800 leading-tight">
                  {activeSub.make} {activeSub.model}
                </div>
                <div className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-orange-100 text-orange-800 border border-orange-200 mt-1">
                  {activeSub.registration}
                </div>
              </div>
            )}
          </div>
        ) : <span className="text-red-500 font-medium">N/A</span>;
      },
    },
    {
      header: 'Customer',
      cell: ({ row }: any) => {
        const c = customers.find(c => c.id === row.original.customerId);
        return c ? (
          <div>
            <div className="font-bold text-gray-900">{c.name}</div>
            <div className="text-sm text-gray-500 mt-0.5">{c.mobile}</div>
            {c.badgeNumber && (
              <div className="text-xs font-medium text-gray-400 mt-0.5">Badge: {c.badgeNumber}</div>
            )}
            {c.address && (
              <div className="text-xs text-gray-400 truncate max-w-[150px] mt-0.5" title={c.address}>
                {c.address}
              </div>
            )}
          </div>
        ) : <span className="text-red-500 font-medium">N/A</span>;
      },
    },
    {
      header: 'Type',
      cell: ({ row }: any) => {
        const r = row.original as Rental;
        let displayReason = r.reason;
        
        if (displayReason === 'h-substitute') {
            const subs = r.hireSubstitutionDetails || [];
            if (subs.length > 0 && !subs.some(s => !s.returnCondition)) displayReason = 'hired';
        }

        return (
          <div className="flex flex-col items-start space-y-1.5">
            <StatusBadge status={r.type} />
            <StatusBadge status={displayReason} />
          </div>
        );
      },
    },
    {
      header: 'Period',
      cell: ({ row }: any) => {
        const r = row.original as Rental;
        const start = ensureValidDate(r.startDate);
        const end = ensureValidDate(r.endDate);
        const unit = r.type === 'weekly' ? 'week' : 'day';

        const totalHours = differenceInHours(end, start);
        const baseDays = totalHours <= 0 ? 1 : Math.ceil(totalHours / 24);
        const baseUnits = r.type === 'weekly' ? Math.ceil(baseDays / 7) : baseDays;
        
        const now = new Date();
        const showOngoingUnits = isAfter(now, end) && !INACTIVE_STATUSES.has(r.status);
        const ongoingUnits = showOngoingUnits ? getOverdueUnits(r, now) : 0;

        const isOngoing = r.status === 'active' && isAfter(now, end);
        const canExtend = can('rentals', 'update');
        const hasSubs = (r.hireSubstitutionDetails || []).length > 0;

        if (hasSubs) {
          const getTimelineSegments = () => {
            const segments: Array<{ type: 'main' | 'sub'; label: string; start: Date; end: Date; registration?: string }> = [];
            const sortedSubs = r.hireSubstitutionDetails!.slice().sort((a, b) => (ensureValidDate(a.givenAt)?.getTime() || 0) - (ensureValidDate(b.givenAt)?.getTime() || 0));
  
            let currentCursor = start;
            for (let i = 0; i < sortedSubs.length; i++) {
              const sub = sortedSubs[i];
              const subGiven = ensureValidDate(sub.givenAt);
              if (!subGiven) continue;
  
              if (subGiven > currentCursor) segments.push({ type: 'main', label: 'Main', start: currentCursor, end: subGiven });
  
              let subEnd = ensureValidDate(sub.returnCondition?.date || sub.expectedReturnAt) || addDays(subGiven, 1);
              if (subEnd <= subGiven) subEnd = addDays(subGiven, 1);
  
              segments.push({ type: 'sub', label: 'Sub', start: subGiven, end: subEnd, registration: sub.registration });
              currentCursor = subEnd;
            }
            if (currentCursor < end) segments.push({ type: 'main', label: 'Main', start: currentCursor, end: end });
            return segments;
          };
  
          return (
            <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
              {getTimelineSegments().map((seg, idx) => (
                <div key={idx} className={`flex flex-col px-2 py-1.5 rounded-md border-l-4 text-xs shadow-sm ${seg.type === 'main' ? 'bg-gray-50 border-gray-400 text-gray-700' : 'bg-yellow-50 border-yellow-400 text-yellow-800'}`}>
                  <div className="flex items-center gap-1 font-bold uppercase tracking-wider mb-0.5 opacity-80">
                    {seg.type === 'main' ? <Car className="w-3 h-3" /> : <ArrowRightLeft className="w-3 h-3" />}
                    <span>{seg.label}</span>
                    {seg.registration && <span className="ml-auto font-mono bg-white/50 px-1 rounded">{seg.registration}</span>}
                  </div>
                  <div className="flex justify-between w-full font-medium">
                     <span>{formatDate(seg.start, true)}</span>
                     <span className="opacity-50 mx-1">→</span>
                     <span>{formatDate(seg.end, true)}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-end text-xs font-medium text-gray-500 mt-1 gap-2">
                 <span>
                    Total: {baseUnits} {unit}{baseUnits === 1 ? '' : 's'}
                    {ongoingUnits > 0 && <span className="text-red-600 ml-1 font-bold">(+{ongoingUnits} O/D)</span>}
                 </span>
                 {isOngoing && canExtend && (
                    <button onClick={(e) => { e.stopPropagation(); onExtend(r); }} className="inline-flex items-center justify-center p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200" title="Update End Date"><CalendarPlus className="w-3.5 h-3.5" /></button>
                 )}
              </div>
            </div>
          );
        }

        return (
          <div className="flex flex-col space-y-2">
            <div>
              <div className="text-sm font-medium text-gray-700">{formatDate(r.startDate, true)}</div>
              <div className="flex items-center gap-2 mt-0.5">
                 <div className="text-sm font-medium text-gray-700">{formatDate(r.endDate, true)}</div>
                 {isOngoing && canExtend && (
                    <button onClick={(e) => { e.stopPropagation(); onExtend(r); }} className="inline-flex items-center justify-center p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200" title="Update End Date"><CalendarPlus className="w-3.5 h-3.5" /></button>
                 )}
              </div>
              
              {r.expectedReturnDate && isValid(r.expectedReturnDate) && r.status !== 'completed' && (
                <div className="mt-1.5 flex items-start gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                  <Clock className="w-3 h-3 mt-0.5" />
                  <span>Return: {formatDate(r.expectedReturnDate, true)}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">
              {baseUnits} {unit}{baseUnits === 1 ? '' : 's'}
              {ongoingUnits > 0 && (
                <span className="text-red-600 block mt-0.5">
                  + {ongoingUnits} ongoing {unit}{ongoingUnits === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      cell: ({ row }: any) => (
        <div className="flex flex-col items-start space-y-1.5">
          <StatusBadge status={row.original.status} />
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      header: 'Cost Summary',
      cell: ({ row }: any) => {
        const r = row.original as Rental;
        const v = vehicles.find(v => v.id === r.vehicleId);
        if (!v) return <div className="text-red-500 text-sm">Vehicle Not Found</div>;

        const { detailedCosts, totalAmountDue, paid, remaining, extraTotal } = getDetailedRentalTotals(r, v);
        
        const unit = r.type === 'weekly' ? 'week' : 'day';
        const vehicleRate = r.type === 'daily' ? (v.dailyRentalPrice ?? 0) : r.type === 'weekly' ? (v.weeklyRentalPrice ?? 0) : (v.claimRentalPrice ?? 0);
        const effectiveRate = (r.negotiatedRate ?? vehicleRate ?? (RENTAL_RATES[r.type] ?? 0)) || 0;
        const isNegotiated = r.negotiatedRate != null;
        const isCredit = remaining < 0;

        const urgencyLevel = getUrgencyLevel(r, remaining);

        return (
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Rate:</span>
              <span className="font-bold text-gray-700">
                {formatCurrency(effectiveRate)}/{unit}{isNegotiated ? ' (neg)' : ''}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Net Period:</span>
              <span className="font-mono text-gray-700">{formatCurrency(detailedCosts.net)}</span>
            </div>

            {/* ✅ Added Extras Display in the summary table */}
            {extraTotal > 0 && (
              <div className="flex justify-between text-indigo-600">
                <span className="font-medium">Extras:</span>
                <span className="font-mono">{formatCurrency(extraTotal)}</span>
              </div>
            )}

            {detailedCosts.vat > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>VAT:</span>
                <span className="font-mono">{formatCurrency(detailedCosts.vat)}</span>
              </div>
            )}

            <div className="border-t border-gray-100 my-1.5" />

            <div className="flex justify-between font-bold text-gray-900">
              <span>Total:</span>
              <span className="font-mono">{formatCurrency(totalAmountDue)}</span>
            </div>

            <div className="flex justify-between text-green-700">
              <span>Paid:</span>
              <span className="font-bold font-mono">{formatCurrency(paid)}</span>
            </div>

            <div className={`flex justify-between ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
              <span className="font-bold">{isCredit ? 'Credit' : 'Owing'}:</span>
              <span className="font-black font-mono">{formatCurrency(Math.abs(remaining))}</span>
            </div>
            
            {urgencyLevel === 'red' && (
              <div className="mt-2 flex items-center justify-center gap-1 bg-red-50 text-red-700 text-[10px] font-bold px-2 py-1.5 rounded animate-pulse text-center border border-red-200">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>
                  {(() => {
                    let costText = '';
                    if (r.type === 'weekly') {
                      const weeks = effectiveRate > 0 ? Math.floor(remaining / effectiveRate) : 0;
                      costText = `${weeks} Week${weeks !== 1 ? 's' : ''}`;
                    } else if (r.type === 'daily') {
                      const days = effectiveRate > 0 ? Math.floor(remaining / effectiveRate) : 0;
                      costText = `${days} Day${days !== 1 ? 's' : ''}`;
                    } else {
                      const months = effectiveRate > 0 ? Math.floor(remaining / (effectiveRate * 30)) : 0;
                      costText = `${months} Month${months !== 1 ? 's' : ''}`;
                    }

                    const refDate = r.payments && r.payments.length > 0
                      ? new Date(Math.max(...r.payments.map((p: any) => new Date(p.date).getTime())))
                      : ensureValidDate(r.startDate);
                    
                    const today = new Date();
                    const diffMs = today.getTime() - refDate.getTime();
                    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

                    let timeText = '';
                    if (diffDays >= 30) {
                      const months = Math.floor(diffDays / 30);
                      timeText = `${months} Month${months !== 1 ? 's' : ''}`;
                    } else if (diffDays >= 7) {
                      const weeks = Math.floor(diffDays / 7);
                      timeText = `${weeks} Week${weeks !== 1 ? 's' : ''}`;
                    } else {
                      timeText = `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
                    }

                    return `Urgent: Unpaid ${costText} for ${timeText} up to date`;
                  })()}
                </span>
              </div>
            )}
            
            {urgencyLevel === 'yellow' && (
              <div className="mt-2 flex items-center justify-center gap-1 bg-yellow-50 text-yellow-700 text-[10px] font-bold px-2 py-1.5 rounded border border-yellow-200 text-center">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>Warning: Unpaid Balance</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => {
        const r = row.original as Rental;
        const v = vehicles.find(v => v.id === r.vehicleId)!;
        
        const { remaining } = getDetailedRentalTotals(r, v);
        const hasAgreement = r.documents?.agreements && Object.keys(r.documents.agreements).length > 0;
        const hasInvoice = !!r.documents?.invoice;

        return (
          <div className="flex flex-col gap-1.5 items-center justify-center py-2 min-w-[120px]">
            
            {/* ROW 1: Core Details & Editing */}
            <div className="flex flex-wrap justify-center gap-1">
              {can('rentals','view') && <ActionBtn onClick={() => onView(r)} icon={Eye} colorClass="text-blue-600 bg-blue-50" title="View Details" />}
              {can('rentals', 'note') && <ActionBtn onClick={() => onShowNotes(r)} icon={StickyNote} colorClass={(r.notes?.length || 0) > 0 ? "text-yellow-700 bg-yellow-100 border border-yellow-300" : "text-gray-500 bg-gray-50"} title="Rental Notes" />}
              {can('rentals','update') && <ActionBtn onClick={() => onEdit(r)} icon={Pencil} colorClass="text-indigo-600 bg-indigo-50" title="Edit Rental" />}
              {r.status === 'active' && can('rentals', 'update') && <ActionBtn onClick={() => onSetReturnExpectation?.(r)} icon={Clock} colorClass="text-purple-600 bg-purple-50" title="Set Expected Return Time" />}
            </div>

            {/* ROW 2: Financials & Lifecycle */}
            {/* ROW 2: Financials & Lifecycle */}
            {(remaining > 0 || can('rentals', 'completion') || can('rentals', 'discount')) && (
              <div className="flex flex-wrap justify-center gap-1">
                {remaining > 0 && can('rentals', 'recordPayment') && <ActionBtn onClick={() => onRecordPayment(r)} icon={CreditCard} colorClass="text-emerald-700 bg-emerald-100 border border-emerald-200" title="Record Payment" />}
                
                {/* Removed the 'remaining > 0' check here so it always shows if they have permission */}
                {can('rentals', 'discount') && <ActionBtn onClick={() => onApplyDiscount(r)} icon={Percent} colorClass="text-purple-700 bg-purple-100 border border-purple-200" title="Manage Discounts" />}
                
                {can('rentals', 'completion') && <ActionBtn onClick={() => onComplete(r)} icon={CheckCircle2} colorClass="text-orange-700 bg-orange-100 border border-orange-200" title="Complete / Return" />}
              </div>
            )}

            {/* ROW 3: Documents Generation */}
            {can('rentals', 'singleDoc') && (
              <div className="flex flex-wrap justify-center gap-1 w-full pt-2 mt-1 border-t border-gray-100">
                <ActionBtn onClick={() => onGenerate90DayAgreement?.(r)} icon={CalendarClock} colorClass="text-fuchsia-600 hover:bg-fuchsia-50" title="Generate 90-day Agreement" />
                <ActionBtn onClick={() => onDownloadAgreement(r)} icon={FileSignature} colorClass={hasAgreement ? "text-blue-700 bg-blue-50" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"} title="Generate/Regenerate Agreement" />
                <ActionBtn onClick={() => onDownloadInvoice(r)} icon={Receipt} colorClass={hasInvoice ? "text-green-700 bg-green-50" : "text-gray-400 hover:text-green-600 hover:bg-green-50"} title="Generate/Regenerate Invoice" />
                <ActionBtn onClick={() => onDownloadPermit?.(r)} icon={FileText} colorClass="text-purple-700 hover:bg-purple-50" title="Parking Permit" />
              </div>
            )}

            {/* ROW 4: Destructive Actions */}
            {can('rentals','delete') && r.status !== 'active' && (
              <div className="flex flex-wrap justify-center gap-1 w-full pt-1">
                <ActionBtn onClick={() => onDelete(r)} icon={Trash2} colorClass="text-red-600 hover:bg-red-100 hover:text-red-700" title="Delete Rental" />
              </div>
            )}

          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      data={sortedRentals}
      columns={columns}
      onRowClick={r => can('rentals','view') && onView(r)}
      rowClassName={r => {
        const v = vehicles.find(veh => veh.id === r.vehicleId);
        const { remaining } = getDetailedRentalTotals(r, v);
        const level = getUrgencyLevel(r, remaining);

        // --- 1. URGENCY HIGHLIGHTS ---
        if (level === 'red') {
            return 'bg-red-50/50 hover:bg-red-100 transition-colors border-l-4 border-l-red-500'; 
        }
        if (level === 'yellow') {
            return 'bg-yellow-50/50 hover:bg-yellow-100 transition-colors border-l-4 border-l-yellow-400';
        }

        // 2. Standard Overdue Logic (Red-ish)
        const now = new Date();
        if (r.status === 'active' && isAfter(now, r.endDate)) return 'bg-red-50/30';

        // 3. Ending Soon Logic (Yellow-ish)
        if (
          (r.status === 'active' || r.status === 'scheduled') &&
          isWithinInterval(r.endDate, { start: now, end: addDays(now, 30) })
        )
          return 'bg-yellow-50/30';
        return '';
      }}
    />
  );
};

export default RentalTable;