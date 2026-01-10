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
  CalendarClock
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
  differenceInDays
} from 'date-fns';
import {
  calculateOverdueCost,
  RENTAL_RATES,
  getOverdueUnits,
  calculateRentalCost
} from '../../utils/rentalCalculations';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

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
  onGenerate90DayAgreement?: (rental: Rental) => void;
}

// statuses that DO NOT accrue ongoing charges
const INACTIVE_STATUSES = new Set(['completed', 'complete', 'returned', 'cancelled']);

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
  onGenerate90DayAgreement,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const calculateOwingAmount = (rental: Rental): number => {
    const v = vehicles.find(v => v.id === rental.vehicleId);
    if (!v) return 0;

    const start = ensureValidDate(rental.startDate);
    const end = ensureValidDate(rental.endDate);

    const baseCost = calculateRentalCost(
      start,
      end,
      rental.type,
      v,
      rental.reason,
      rental.negotiatedRate ?? undefined,
      0, 0, 0, 0, 0,
      false, false, false, false, false
    );

    const displayStorageCost = rental.storageCost || 0;
    const displayRecoveryCost = (rental.recoveryCost || 0) * (rental.includeRecoveryCostVAT ? 1.2 : 1);
    const displayDeliveryCharge = rental.deliveryCharge || 0;
    const displayCollectionFee = rental.collectionCharge || 0;
    const insuranceDays = (() => {
      try {
        if (start && end && !isAfter(start, end)) return (differenceInDays(end, start) + 1);
      } catch {}
      return 0;
    })();
    const displayInsuranceCost =
      insuranceDays * (rental.insurancePerDay || 0) * (rental.insurancePerDayIncludeVAT ? 1.2 : 1);

    const subtotalBeforeOverallVAT =
      baseCost +
      displayStorageCost +
      displayRecoveryCost +
      displayDeliveryCharge +
      displayCollectionFee +
      displayInsuranceCost;

    const vatAmount = rental.includeVAT ? subtotalBeforeOverallVAT * 0.2 : 0;
    const subtotalWithOverallVAT = subtotalBeforeOverallVAT + vatAmount;

    const discountedRentalTotal = subtotalWithOverallVAT - (rental.discountAmount ?? 0);

    const now = new Date();
    const ongoingCharges =
      rental.status === 'active' && isAfter(now, end) ? calculateOverdueCost(rental, now, v) : 0;

    const returnCharges = rental.returnCondition?.totalCharges ?? 0;

    const totalAmountDue = discountedRentalTotal + ongoingCharges + returnCharges;
    const paid = rental.paidAmount || 0;
    const remaining = totalAmountDue - paid;

    return remaining > 0 ? remaining : 0;
  };

  const sortedRentals = [...rentals].sort((a, b) => {
    const priority = (r: Rental) => {
      const soon = isWithinInterval(r.endDate, {
        start: new Date(),
        end: addDays(new Date(), 1),
      });
      if (soon && r.status === 'active') return 1;
      if (r.status === 'active') return 2;
      if (r.status === 'scheduled') return 3;
      return 4;
    };
    const pa = priority(a);
    const pb = priority(b);

    if (pa !== pb) return pa - pb;

    const owingA = calculateOwingAmount(a);
    const owingB = calculateOwingAmount(b);
    if (Math.abs(owingA - owingB) > 0.001) return owingB - owingA;

    return isBefore(a.endDate, b.endDate) ? -1 : 1;
  });

  // Helper for consistent Action Buttons (Vertical Stack)
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
      cell: ({ row }) => {
        const r = row.original as Rental;
        const v = vehicles.find(v => v.id === r.vehicleId);
        
        // --- NEW LOGIC: Get latest substitute vehicle ---
        const subs = r.hireSubstitutionDetails || [];
        const latestSub = subs.length > 0 ? subs[subs.length - 1] : null;

        return v ? (
          <div>
            <div className="font-medium">{v.make} {v.model}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {/* Main Vehicle Registration */}
              <div className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-gray-200/60 text-gray-700 border border-gray-200">
                {v.registrationNumber}
              </div>

              {/* Substitute Vehicle Registration (Orange Badge) */}
              {latestSub && latestSub.registration && (
                <div 
                  className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-orange-100 text-orange-800 border border-orange-200"
                  title={`Substitute: ${latestSub.make} ${latestSub.model}`}
                >
                  Substitute: {latestSub.registration}
                </div>
              )}
            </div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Customer',
      cell: ({ row }) => {
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
      cell: ({ row }) => (
        <div className="flex flex-col items-start space-y-1">
          <StatusBadge status={row.original.type} />
          <StatusBadge status={row.original.reason} />
        </div>
      ),
    },
    {
      header: 'Period',
      cell: ({ row }) => {
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

        return (
          <div>
            <div className="text-sm">{formatDate(r.startDate, true)}</div>
            <div className="text-sm text-gray-500">{formatDate(r.endDate, true)}</div>
            <div className="text-xs text-gray-500">
              {baseUnits} {unit}{baseUnits === 1 ? '' : 's'}
              {ongoingUnits > 0 && (
                <> + {ongoingUnits} ongoing {unit}{ongoingUnits === 1 ? '' : 's'}</>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <div className="flex flex-col items-start space-y-1">
          <StatusBadge status={row.original.status} />
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      header: 'Cost Summary',
      cell: ({ row }) => {
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
          start,
          end,
          r.type,
          v,
          r.reason,
          r.negotiatedRate ?? undefined,
          0, 0, 0, 0, 0,
          false, false, false, false, false
        );

        const totalHours = differenceInHours(end, start);
        const baseDays = totalHours <= 0 ? 1 : Math.ceil(totalHours / 24);
        const baseUnits = r.type === 'weekly' ? Math.ceil(baseDays / 7) : baseDays;

        const displayStorageCost = r.storageCost || 0;
        const displayRecoveryCost = (r.recoveryCost || 0) * (r.includeRecoveryCostVAT ? 1.2 : 1);
        const displayDeliveryCharge = r.deliveryCharge || 0;
        const displayCollectionFee = r.collectionCharge || 0;

        const insuranceDays = (() => {
          try {
            if (start && end && !isAfter(start, end)) return (differenceInDays(end, start) + 1);
          } catch {}
          return 0;
        })();
        const displayInsuranceCost =
          insuranceDays * (r.insurancePerDay || 0) * (r.insurancePerDayIncludeVAT ? 1.2 : 1);

        const subtotalBeforeOverallVAT =
          baseCost +
          displayStorageCost +
          displayRecoveryCost +
          displayDeliveryCharge +
          displayCollectionFee +
          displayInsuranceCost;

        const vatAmount = r.includeVAT ? subtotalBeforeOverallVAT * 0.2 : 0;
        const subtotalWithOverallVAT = subtotalBeforeOverallVAT + vatAmount;

        const discountedRentalTotal = subtotalWithOverallVAT - (r.discountAmount ?? 0);

        const now = new Date();
        const ongoingCharges =
          r.status === 'active' && isAfter(now, end) ? calculateOverdueCost(r, now, v) : 0;

        const returnCharges = r.returnCondition?.totalCharges ?? 0;

        const totalAmountDue = discountedRentalTotal + ongoingCharges + returnCharges;
        const paid = r.paidAmount || 0;
        const remaining = totalAmountDue - paid;

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
                {baseUnits} {unit}{baseUnits === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Net:</span>
              <span className="font-medium">{formatCurrency(subtotalBeforeOverallVAT)}</span>
            </div>

            {r.includeVAT && (
              <div className="flex justify-between text-blue-600">
                <span>VAT:</span>
                <span className="font-medium">{formatCurrency(vatAmount)}</span>
              </div>
            )}

            {returnCharges > 0 && (
              <div className="flex justify-between">
                <span>Return Charges:</span>
                <span className="font-medium">{formatCurrency(returnCharges)}</span>
              </div>
            )}

            <div className="border-t my-1" />

            <div className="flex justify-between font-semibold">
              <span>Total:</span>
              <span className="font-medium">{formatCurrency(totalAmountDue)}</span>
            </div>

            <div className="flex justify-between text-green-700">
              <span>Amount Paid:</span>
              <span className="font-bold">{formatCurrency(paid)}</span>
            </div>
            <div className="flex justify-between text-red-700">
              <span>Owing:</span>
              <span className="font-bold">{formatCurrency(remaining)}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const r = row.original as Rental;
        const v = vehicles.find(v => v.id === r.vehicleId)!;

        // Recalculate remaining just to check if payment/discount buttons should show
        const start = ensureValidDate(r.startDate);
        const end = ensureValidDate(r.endDate);
        const baseCost = calculateRentalCost(
          start, end, r.type, v, r.reason, r.negotiatedRate ?? undefined,
          0, 0, 0, 0, 0, false, false, false, false, false
        );
        const now = new Date();
        const ongoingCharges = r.status === 'active' && isAfter(now, end) ? calculateOverdueCost(r, now, v) : 0;
        const returnCharges = r.returnCondition?.totalCharges ?? 0;
        const discountedBaseWithVAT = (baseCost * (r.includeVAT ? 1.2 : 1)) - (r.discountAmount ?? 0);
        const totalAmountDue = discountedBaseWithVAT + ongoingCharges + returnCharges;
        const remaining = totalAmountDue - (r.paidAmount || 0);

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

            {can('rentals','update') && (
              <>
                <ActionBtn 
                  onClick={() => onEdit(r)} 
                  icon={Pencil} 
                  colorClass="text-indigo-600" 
                  title="Edit Rental" 
                />

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

            {/* Document Buttons Group */}
            <div className="flex gap-1 mt-1 pt-1 border-t w-full justify-center border-gray-100">
                {r.documents?.agreements && Object.keys(r.documents.agreements).length > 0 && (
                  <ActionBtn 
                    onClick={() => onDownloadAgreement(r)} 
                    icon={FileSignature} 
                    colorClass="text-blue-700" 
                    title="Download Agreement" 
                  />
                )}

                {r.documents?.invoice && (
                  <ActionBtn 
                    onClick={() => onDownloadInvoice(r)} 
                    icon={Receipt} 
                    colorClass="text-green-700" 
                    title="Download Invoice" 
                  />
                )}
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
        const now = new Date();
        if (r.status === 'active' && isAfter(now, r.endDate)) return 'bg-red-50';
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