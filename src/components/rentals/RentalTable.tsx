// src/components/rentals/RentalTable.tsx
import React from 'react';
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
  differenceInDays
} from 'date-fns';
import {
  calculateOverdueCost,
  RENTAL_RATES,
  getOverdueUnits,
  calculateRentalCost
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

  const calculateOwingAmount = (rental: Rental): number => {
    const v = vehicles.find(v => v.id === rental.vehicleId);
    if (!v) return 0;

    const start = ensureValidDate(rental.startDate);
    const end = ensureValidDate(rental.endDate);

    const totalWithAllVAT = calculateRentalCost(
      start,
      end,
      rental.type,
      v,
      rental.reason,
      rental.negotiatedRate ?? undefined,
      rental.storageCost || 0,
      rental.recoveryCost || 0,
      
      rental.deliveryCharge || 0,
      rental.collectionCharge || 0,
      
      rental.insurancePerDay || 0,
      (rental as any).insurancePerWeek || 0,
      
      rental.includeVAT,
      false, 
      false, 
      
      rental.insurancePerDayIncludeVAT,
      (rental as any).insurancePerWeekIncludeVAT,
      rental.includeRecoveryCostVAT
    );

    const discountedTotal = totalWithAllVAT - (rental.discountAmount ?? 0);

    const now = new Date();
    const ongoingCharges =
      rental.status === 'active' && isAfter(now, end) ? calculateOverdueCost(rental, now, v) : 0;

    const subCharges = (rental.hireSubstitutionDetails || []).reduce((acc, sub) => acc + (sub.returnCondition?.totalCharges || 0), 0);
    const returnCharges = (rental.returnCondition?.totalCharges ?? 0) + subCharges;

    const totalAmountDue = discountedTotal + ongoingCharges + returnCharges;
    const paid = rental.paidAmount || 0;
    const remaining = totalAmountDue - paid;

    return remaining > 0 ? remaining : 0;
  };

  const getUrgencyLevel = (r: Rental): UrgencyLevel => {
    // ALLOW BOTH ACTIVE AND COMPLETED RENTALS TO TRIGGER WARNINGS IF UNPAID
    if (r.status !== 'active' && r.status !== 'completed') return 'none';
    
    const owing = calculateOwingAmount(r);
    if (owing <= 0.01) return 'none';

    const v = vehicles.find(veh => veh.id === r.vehicleId);
    if (!v) return 'none';

    const vehicleRate =
      r.type === 'daily' ? (v.dailyRentalPrice ?? 0)
      : r.type === 'weekly' ? (v.weeklyRentalPrice ?? 0)
      : (v.claimRentalPrice ?? 0);
      
    const fallback = RENTAL_RATES[r.type] ?? 0;
    const effectiveRate = (r.negotiatedRate ?? vehicleRate ?? fallback) || 0;

    if (effectiveRate <= 0) return 'none';

    // Adding 0.01 buffer so exactly 1 week (e.g. 330.00) doesn't falsely trigger the warning
    if (r.type === 'weekly') {
      // Warning ONLY if owing is strictly greater than 1 week's rate
      if (owing > effectiveRate + 0.01) return 'red';
    } 
    else if (r.type === 'daily') {
      // Warning ONLY if owing is strictly greater than 7 days worth of the daily rate
      if (owing > (effectiveRate * 7) + 0.01) return 'red';
    } 
    else if (r.type === 'claim') {
      // Warning ONLY if owing is strictly greater than 6 months (~180 days) worth of the claim rate
      if (owing > (effectiveRate * 180) + 0.01) return 'red';
    }

    return 'none';
  };

  const sortedRentals = [...rentals].sort((a, b) => {
    const owingA = calculateOwingAmount(a);
    const owingB = calculateOwingAmount(b);
    if (Math.abs(owingA - owingB) > 0.001) {
      return owingB - owingA;
    }

    const urgencyScore = (r: Rental) => {
        const level = getUrgencyLevel(r);
        if (level === 'red') return 3;
        if (level === 'yellow') return 2;
        return 1;
    };
    const scoreA = urgencyScore(a);
    const scoreB = urgencyScore(b);
    if (scoreA !== scoreB) return scoreB - scoreA;

    return isBefore(a.endDate, b.endDate) ? -1 : 1;
  });

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
        const latestSub = subs.length > 0 ? subs[subs.length - 1] : null;

        return v ? (
          <div className="flex flex-col space-y-2">
            <div>
              {r.rentalAgreementNumber && (
                <div className="mb-1">
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    AGR-{r.rentalAgreementNumber}
                  </span>
                </div>
              )}
              
              <div className="font-medium text-gray-900">{v.make} {v.model}</div>
              <div className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-gray-100 text-gray-700 border border-gray-200 mt-0.5">
                {v.registrationNumber}
              </div>
            </div>
            {latestSub && (latestSub.make || latestSub.model || latestSub.registration) && (
              <div className="pl-2 border-l-2 border-orange-300">
                <div className="text-[10px] uppercase text-orange-700 font-bold mb-0.5">Active Substitute</div>
                <div className="font-medium text-sm text-gray-800 leading-tight">
                  {latestSub.make} {latestSub.model}
                </div>
                <div className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-orange-100 text-orange-800 border border-orange-200 mt-1">
                  {latestSub.registration}
                </div>
              </div>
            )}
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Customer',
      cell: ({ row }: any) => {
        const c = customers.find(c => c.id === row.original.customerId);
        return c ? (
          <div>
            <div className="font-medium">{c.name}</div>
            <div className="text-sm text-gray-500">{c.mobile}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Type',
      cell: ({ row }: any) => (
        <div className="flex flex-col items-start space-y-1">
          <StatusBadge status={row.original.type} />
          <StatusBadge status={row.original.reason} />
        </div>
      ),
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
        const canExtend = user?.role === 'manager' || user?.role === 'admin';

        const subs = r.hireSubstitutionDetails || [];
        const hasSubs = subs.length > 0;

        if (hasSubs) {
          const getTimelineSegments = () => {
            const segments: Array<{ type: 'main' | 'sub'; label: string; start: Date; end: Date; registration?: string }> = [];
            
            const sortedSubs = subs.slice().sort((a, b) => {
               const dA = ensureValidDate(a.givenAt)?.getTime() || 0;
               const dB = ensureValidDate(b.givenAt)?.getTime() || 0;
               return dA - dB;
            });
  
            let currentCursor = start;
  
            for (let i = 0; i < sortedSubs.length; i++) {
              const sub = sortedSubs[i];
              const subGiven = ensureValidDate(sub.givenAt);
              if (!subGiven) continue;
  
              if (subGiven > currentCursor) {
                segments.push({ type: 'main', label: 'Main', start: currentCursor, end: subGiven });
              }
  
              const subReturnRaw = sub.returnCondition?.date || sub.expectedReturnAt;
              let subEnd = ensureValidDate(subReturnRaw) || addDays(subGiven, 1);
              if (subEnd <= subGiven) subEnd = addDays(subGiven, 1);
  
              segments.push({ 
                type: 'sub', 
                label: 'Sub', 
                start: subGiven, 
                end: subEnd,
                registration: sub.registration
              });
  
              currentCursor = subEnd;
            }
  
            if (currentCursor < end) {
              segments.push({ type: 'main', label: 'Main', start: currentCursor, end: end });
            }
            return segments;
          };
  
          const timeline = getTimelineSegments();
  
          return (
            <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
              {timeline.map((seg, idx) => (
                <div 
                  key={idx} 
                  className={`
                    flex flex-col px-2 py-1.5 rounded-md border-l-4 text-xs shadow-sm
                    ${seg.type === 'main' 
                      ? 'bg-gray-50 border-gray-400 text-gray-700' 
                      : 'bg-yellow-50 border-yellow-400 text-yellow-800'
                    }
                  `}
                >
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
                    {ongoingUnits > 0 && (
                      <span className="text-red-600 ml-1 font-bold">
                        (+{ongoingUnits} O/D)
                      </span>
                    )}
                 </span>
                 
                 {isOngoing && canExtend && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onExtend(r); }}
                      className="inline-flex items-center justify-center p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200"
                      title="Update End Date"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                 )}
              </div>
            </div>
          );
        }

        return (
          <div className="flex flex-col space-y-2">
            <div>
              <div className="text-sm">{formatDate(r.startDate, true)}</div>
              <div className="flex items-center gap-2">
                 <div className="text-sm text-gray-500">{formatDate(r.endDate, true)}</div>
                 {isOngoing && canExtend && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onExtend(r); }}
                      className="inline-flex items-center justify-center p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 border border-blue-200"
                      title="Update End Date"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                    </button>
                 )}
              </div>
              
              {r.expectedReturnDate && isValid(r.expectedReturnDate) && r.status !== 'completed' && (
                <div className="mt-1 flex items-start gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                  <Clock className="w-3 h-3 mt-0.5" />
                  <span>Return Soon: {formatDate(r.expectedReturnDate, true)}</span>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-500 font-medium">
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
        <div className="flex flex-col items-start space-y-1">
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

        const start = ensureValidDate(r.startDate);
        const end = ensureValidDate(r.endDate);
        const unit = r.type === 'weekly' ? 'week' : 'day';

        const vehicleRate =
          r.type === 'daily' ? (v.dailyRentalPrice ?? 0)
          : r.type === 'weekly' ? (v.weeklyRentalPrice ?? 0)
          : (v.claimRentalPrice ?? 0);
        const fallback = RENTAL_RATES[r.type] ?? 0;
        const effectiveRate = (r.negotiatedRate ?? vehicleRate ?? fallback) || 0;
        const isNegotiated = r.negotiatedRate != null;

        const baseCost = calculateRentalCost(
          start, end, r.type, v, r.reason, r.negotiatedRate ?? undefined,
          0, 0, 0, 0, 0, 0,
          false, false, false, false, false, false
        );

        const hireVatAmount = r.includeVAT ? baseCost * 0.2 : 0;

        const totalWithAllVAT = calculateRentalCost(
            start, end, r.type, v, r.reason, r.negotiatedRate ?? undefined,
            r.storageCost || 0, r.recoveryCost || 0, 
            
            r.deliveryCharge || 0, 
            r.collectionCharge || 0,
            
            r.insurancePerDay || 0, (r as any).insurancePerWeek || 0,
            
            r.includeVAT, 
            false, 
            false,
            
            r.insurancePerDayIncludeVAT, (r as any).insurancePerWeekIncludeVAT, r.includeRecoveryCostVAT
        );

        const discountedRentalTotal = totalWithAllVAT - (r.discountAmount ?? 0);
        const now = new Date();
        const ongoingCharges =
          r.status === 'active' && isAfter(now, end) ? calculateOverdueCost(r, now, v) : 0;
        const subCharges = (r.hireSubstitutionDetails || []).reduce((acc, sub) => acc + (sub.returnCondition?.totalCharges || 0), 0);
        const returnCharges = (r.returnCondition?.totalCharges ?? 0) + subCharges;
        const totalAmountDue = discountedRentalTotal + ongoingCharges + returnCharges;
        const paid = r.paidAmount || 0;
        const remaining = totalAmountDue - paid;
        const isCredit = remaining < 0;

        const urgencyLevel = getUrgencyLevel(r);

        return (
          <div className="space-y-1 text-base">
            <div className="flex justify-between">
              <span>Rate:</span>
              <span className="font-medium">
                {formatCurrency(effectiveRate)}/{unit}{isNegotiated ? ' (negotiated)' : ''}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Period:</span>
              <span className="font-medium">
                {formatCurrency(baseCost)}
              </span>
            </div>

            {r.includeVAT && (
              <div className="flex justify-between text-blue-600">
                <span>Hire VAT:</span>
                <span className="font-medium">{formatCurrency(hireVatAmount)}</span>
              </div>
            )}

            <div className="border-t my-1" />

            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span className="font-medium">{formatCurrency(totalAmountDue)}</span>
            </div>

            <div className="flex justify-between text-green-700">
              <span>Paid:</span>
              <span className="font-bold">{formatCurrency(paid)}</span>
            </div>

            <div className={`flex justify-between ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
              <span>{isCredit ? 'Credit' : 'Owing'}:</span>
              <span className="font-bold">{formatCurrency(Math.abs(remaining))}</span>
            </div>
            
            {urgencyLevel === 'red' && (
              <div className="mt-1 flex items-center justify-center gap-1 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded animate-pulse text-center">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                <span>
                  {(() => {
                    if (r.type === 'weekly') {
                      const weeks = effectiveRate > 0 ? Math.floor(remaining / effectiveRate) : 0;
                      return `Urgent: Unpaid ${weeks} Week${weeks !== 1 ? 's' : ''}`;
                    } else if (r.type === 'daily') {
                      const days = effectiveRate > 0 ? Math.floor(remaining / effectiveRate) : 0;
                      return `Urgent: Unpaid ${days} Day${days !== 1 ? 's' : ''}`;
                    } else {
                      const months = effectiveRate > 0 ? Math.floor(remaining / (effectiveRate * 30)) : 0;
                      return `Urgent: Unpaid ${months} Month${months !== 1 ? 's' : ''}`;
                    }
                  })()}
                </span>
              </div>
            )}
            
            {urgencyLevel === 'yellow' && (
              <div className="mt-1 flex items-center justify-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded border border-yellow-200 text-center">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>Warning: Unpaid</span>
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

        // Recalculate remaining for logic check
        const start = ensureValidDate(r.startDate);
        const end = ensureValidDate(r.endDate);
        const totalWithAllVAT = calculateRentalCost(
            start, end, r.type, v, r.reason, r.negotiatedRate ?? undefined,
            r.storageCost || 0, r.recoveryCost || 0, r.deliveryCharge || 0, r.collectionCharge || 0,
            r.insurancePerDay || 0, (r as any).insurancePerWeek || 0,
            r.includeVAT, 
            false,
            false,
            r.insurancePerDayIncludeVAT, (r as any).insurancePerWeekIncludeVAT, r.includeRecoveryCostVAT
        );
        const now = new Date();
        const ongoingCharges = r.status === 'active' && isAfter(now, end) ? calculateOverdueCost(r, now, v) : 0;
        const subCharges = (r.hireSubstitutionDetails || []).reduce((acc, sub) => acc + (sub.returnCondition?.totalCharges || 0), 0);
        const returnCharges = (r.returnCondition?.totalCharges ?? 0) + subCharges;
        const discountedTotal = totalWithAllVAT - (r.discountAmount ?? 0);
        const totalAmountDue = discountedTotal + ongoingCharges + returnCharges;
        const remaining = totalAmountDue - (r.paidAmount || 0);

        const hasAgreement = r.documents?.agreements && Object.keys(r.documents.agreements).length > 0;
        const hasInvoice = !!r.documents?.invoice;

        return (
          <div className="flex flex-col gap-1 items-center justify-center py-1">
            {can('rentals','view') && (
              <ActionBtn 
                onClick={() => onView(r)} 
                icon={Eye} 
                colorClass="text-blue-600" 
                title="View Details" 
              />
            )}

          <ActionBtn 
            onClick={() => onShowNotes(r)} 
            icon={StickyNote} 
            colorClass={(r.notes?.length || 0) > 0 ? "text-yellow-600 fill-yellow-50" : "text-gray-400"} 
            title="Rental Notes" 
          />

            {can('rentals','update') && (
              <>
                <ActionBtn 
                  onClick={() => onEdit(r)} 
                  icon={Pencil} 
                  colorClass="text-indigo-600" 
                  title="Edit Rental" 
                />

                {r.status === 'active' && (
                  <ActionBtn
                    onClick={() => onSetReturnExpectation?.(r)}
                    icon={Clock}
                    colorClass="text-purple-600"
                    title="Set Expected Return Time"
                  />
                )}

                {remaining > 0 && (
                  <div className="flex gap-1">
                    <ActionBtn 
                      onClick={() => onRecordPayment(r)} 
                      icon={CreditCard} 
                      colorClass="text-emerald-600" 
                      title="Record Payment" 
                    />
                    <ActionBtn 
                      onClick={() => onApplyDiscount(r)} 
                      icon={Percent} 
                      colorClass="text-purple-600" 
                      title="Apply Discount" 
                    />
                  </div>
                )}

                <ActionBtn 
                  onClick={() => onComplete(r)} 
                  icon={CheckCircle2} 
                  colorClass="text-orange-600" 
                  title="Complete / Return" 
                />

                <ActionBtn 
                  onClick={() => onGenerate90DayAgreement?.(r)} 
                  icon={CalendarClock} 
                  colorClass="text-fuchsia-600" 
                  title="Generate 90-day Agreement" 
                />
              </>
            )}

            <div className="flex gap-1 mt-1 pt-1 border-t w-full justify-center border-gray-100">
                <ActionBtn 
                  onClick={() => onDownloadAgreement(r)} 
                  icon={FileSignature} 
                  colorClass={hasAgreement ? "text-blue-700" : "text-gray-400 hover:text-blue-700"} 
                  title="Generate/Regenerate Agreement" 
                />

                <ActionBtn 
                  onClick={() => onDownloadInvoice(r)} 
                  icon={Receipt} 
                  colorClass={hasInvoice ? "text-green-700" : "text-gray-400 hover:text-green-700"} 
                  title="Generate/Regenerate Invoice" 
                />

                <ActionBtn 
                   onClick={() => onDownloadPermit?.(r)} 
                   icon={FileText} 
                   colorClass="text-purple-700" 
                   title="Parking Permit" 
                />
            </div>

            {can('rentals','delete') && r.status !== 'active' && (
              <ActionBtn 
                onClick={() => onDelete(r)} 
                icon={Trash2} 
                colorClass="text-red-600 hover:bg-red-50" 
                title="Delete Rental" 
              />
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
        const level = getUrgencyLevel(r);

        // --- 1. URGENCY HIGHLIGHTS ---
        if (level === 'red') {
            return 'bg-red-100 hover:bg-red-200 transition-colors border-l-4 border-l-red-500'; 
        }
        if (level === 'yellow') {
            return 'bg-yellow-100 hover:bg-yellow-200 transition-colors border-l-4 border-l-yellow-400';
        }

        // 2. Standard Overdue Logic (Red-ish)
        const now = new Date();
        if (r.status === 'active' && isAfter(now, r.endDate)) return 'bg-red-50';

        // 3. Ending Soon Logic (Yellow-ish)
        if (
          (r.status === 'active' || r.status === 'scheduled') &&
          isWithinInterval(r.endDate, { start: now, end: addDays(now, 30) })
        )
          return 'bg-yellow-50';
        return '';
      }}
    />
  );
};

export default RentalTable;