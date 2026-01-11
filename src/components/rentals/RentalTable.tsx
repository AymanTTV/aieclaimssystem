// src/components/rentals/RentalTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Rental, Vehicle, Customer } from '../../types';
import {
  Eye,
  Edit,
  Trash2,
  FileText,
  Download,
  RotateCw,
  DollarSign,
  Tag
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

  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        const v = vehicles.find(v => v.id === row.original.vehicleId);
        return v ? (
          <div>
            <div className="font-medium">{v.make} {v.model}</div>
            <div className="text-sm text-gray-500">{v.registrationNumber}</div>
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

        const start = ensureValidDate(r.startDate);
        const end = ensureValidDate(r.endDate);

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

        const now = new Date();
        const ongoingCharges =
          r.status === 'active' && isAfter(now, end) ? calculateOverdueCost(r, now, v) : 0;

        const returnCharges = r.returnCondition?.totalCharges ?? 0;
        const discountedBaseWithVAT = (baseCost * (r.includeVAT ? 1.2 : 1)) - (r.discountAmount ?? 0);
        const totalAmountDue = discountedBaseWithVAT + ongoingCharges + returnCharges;

        const paid = r.paidAmount || 0;
        const remaining = totalAmountDue - paid;

        return (
          <div className="flex space-x-2">
            {can('rentals','view') && (
              <button onClick={e => { e.stopPropagation(); onView(r); }} title="View">
                <Eye className="h-4 w-4 text-blue-600 hover:text-blue-800"/>
              </button>
            )}

            {can('rentals','update') && (
              <>
                <button onClick={e => { e.stopPropagation(); onEdit(r); }} title="Edit">
                  <Edit className="h-4 w-4 text-blue-600 hover:text-blue-800"/>
                </button>

                {remaining > 0 && (
                  <>
                    <button
                      onClick={e => { e.stopPropagation(); onRecordPayment(r); }}
                      title="Record Payment"
                    >
                      <DollarSign className="h-4 w-4 text-primary hover:text-primary-600"/>
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); onApplyDiscount(r); }}
                      title="Apply Discount"
                    >
                      <Tag className="h-4 w-4 text-green-600 hover:text-green-800"/>
                    </button>
                  </>
                )}

                <button
                  onClick={e => { e.stopPropagation(); onComplete(r); }}
                  title="Complete Return"
                >
                  <RotateCw className="h-4 w-4 text-green-600 hover:text-green-800"/>
                </button>

                <button
                  onClick={e => { e.stopPropagation(); onGenerate90DayAgreement?.(r); }}
                  title="Generate 90-day Agreement"
                >
                  <FileText className="h-4 w-4 text-purple-600 hover:text-purple-800"/>
                </button>
              </>
            )}

            {can('rentals','delete') && r.status !== 'active' && (
              <button onClick={e => { e.stopPropagation(); onDelete(r); }} title="Delete">
                <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800"/>
              </button>
            )}

            {/* ----------------- ✅ FIX 5: Check the correct 'agreements' map ----------------- */}
            {r.documents?.agreements && Object.keys(r.documents.agreements).length > 0 && (
              <button onClick={e => { e.stopPropagation(); onDownloadAgreement(r); }} title="Agreement">
                <FileText className="h-4 w-4 text-blue-600 hover:text-blue-800"/>
              </button>
            )}
            {/* ----------------- END OF FIX 5 ----------------- */}

            {r.documents?.invoice && (
              <button onClick={e => { e.stopPropagation(); onDownloadInvoice(r); }} title="Invoice">
                <Download className="h-4 w-4 text-green-600 hover:text-green-800"/>
              </button>
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