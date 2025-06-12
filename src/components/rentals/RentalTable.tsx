// RentalTable.tsx
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
import { formatDate } from '../../utils/dateHelpers';
import { isAfter, differenceInDays, isWithinInterval, isBefore, addDays } from 'date-fns';
import { calculateOverdueCost, RENTAL_RATES } from '../../utils/rentalCalculations';
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
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

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
    const pa = priority(a), pb = priority(b);
    if (pa === pb) return isBefore(a.endDate, b.endDate) ? -1 : 1;
    return pa - pb;
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
        <div className="space-y-1">
          <StatusBadge status={row.original.type} />
          <StatusBadge status={row.original.reason} />
        </div>
      ),
    },
    {
      header: 'Period',
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div>
            <div className="text-sm">{formatDate(r.startDate, true)}</div>
            <div className="text-sm text-gray-500">{formatDate(r.endDate, true)}</div>
            <div className="text-xs text-gray-500">
              {differenceInDays(r.endDate, r.startDate) + 1} days
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },

    {
      header: 'Cost Details',
      cell: ({ row }) => {
        const r = row.original;
        const v = vehicles.find(v => v.id === r.vehicleId); // Find the vehicle
        if (!v) { // Check if vehicle is found
          return <div className="text-red-500">Vehicle Not Found</div>;
        }

        const now = new Date();
        const days = differenceInDays(r.endDate, r.startDate) + 1;

        // 1) Determine per-unit rate (base rate without negotiation)
        let baseRate = r.type === 'daily'
            ? v.dailyRentalPrice
            : r.type === 'weekly'
              ? v.weeklyRentalPrice
              : v.claimRentalPrice;
        if (baseRate == null) baseRate = RENTAL_RATES[r.type] || 0;

        // Determine effective rate (with negotiation if applicable)
        const effectiveRate = r.negotiatedRate != null ? r.negotiatedRate : baseRate;


        // 2) Compute base units (days or weeks)
        const baseUnits = r.type === 'weekly'
          ? (r.numberOfWeeks || Math.ceil(days / 7))
          : days;

        // Calculate base cost using effective rate
        const baseCostCalculated = effectiveRate * baseUnits;


        // 3) Ongoing (overdue) charges
        const showOverdue = r.status === 'active' && isAfter(now, r.endDate);
        const ongoing = showOverdue
            ? calculateOverdueCost(r, now, v) // calculateOverdueCost now handles VAT
            : 0;

        // Note: Calculating overdue units might be complex with mixed rates/VAT, showing total ongoing is simpler
        // const overdueUnits = ongoing && effectiveRate > 0 ? Math.round(ongoing / effectiveRate) : 0; // This might be inaccurate with VAT included


        // 4) Claim-specific extras sum (these values already include their specific VAT if applicable as stored)
        const storageWithVAT = (r.storageCost || 0);
        const recoveryWithVAT = (r.recoveryCost || 0) * (r.includeRecoveryCostVAT ? 1.2 : 1); // NEW: Apply VAT for display
        const deliveryWithVAT = (r.deliveryCharge || 0);
        const collectionWithVAT = (r.collectionCharge || 0);
         // Insurance per day is stored, need to calculate total insurance cost for the period applying stored VAT setting
        const insuranceWithVAT = (days * (r.insurancePerDay || 0)) * (r.insurancePerDayIncludeVAT ? 1.2 : 1);


        const extrasWithVAT = (r.type === 'claim') ? (storageWithVAT + recoveryWithVAT + deliveryWithVAT + collectionWithVAT + insuranceWithVAT) : 0;

        // Total before overall rental VAT and discount
        const totalBeforeOverallVAT = baseCostCalculated + extrasWithVAT + ongoing;


        // Apply overall rental VAT
        const totalWithOverallVAT = totalBeforeOverallVAT * (r.includeVAT ? 1.2 : 1);


        // 5) Discount, paid & remaining
        const discount = r.discountAmount || 0;
        const totalDue = totalWithOverallVAT - discount; // Total after all VAT and discount
        const paid = r.paidAmount || 0;
        const remaining = totalDue - paid;

        return (
          <div className="space-y-1 text-sm">
            {/* Rate in green */}
            <div className="text-green-600">
              <strong>Rate:</strong> {formatCurrency(effectiveRate)}{r.negotiatedRate != null && ' (Negotiated)'}
            </div>

             {/* Base Rental Cost based on Period and Rate */}
             <div className="text-gray-800">
               <strong>Base Cost:</strong> {baseUnits} {r.type === 'weekly' ? 'week' : 'day'}{baseUnits > 1 ? 's' : ''} × {formatCurrency(effectiveRate)} = {formatCurrency(baseCostCalculated)}
             </div>


            {/* Ongoing in red */}
            {ongoing > 0 && (
              <div className="text-red-600">
                <strong>Ongoing Charges:</strong> +{formatCurrency(ongoing)}
              </div>
            )}

             {/* Claim extras in dark gray */}
            {r.type === 'claim' && (storageWithVAT > 0 || recoveryWithVAT > 0 || deliveryWithVAT > 0 || collectionWithVAT > 0 || insuranceWithVAT > 0) && (
              <div className="text-gray-800">
                <strong>Claim Extra Charges:</strong> {formatCurrency(storageWithVAT + recoveryWithVAT + deliveryWithVAT + collectionWithVAT + insuranceWithVAT)}
              </div>
            )}


            {/* Subtotal before overall VAT */}
             <div>
               <strong>Subtotal (before VAT):</strong> {formatCurrency(totalBeforeOverallVAT)}
             </div>
             {/* Overall VAT */}
             {r.includeVAT && (
                <div className="text-blue-600">
                    <strong>VAT (20%):</strong> {formatCurrency(totalWithOverallVAT - totalBeforeOverallVAT)}
                </div>
             )}
            {/* Total normal */}
            <div>
              <strong>Total (with VAT):</strong> {formatCurrency(totalWithOverallVAT)}
            </div>


            {/* Discount in blue */}
            {discount > 0 && (
              <div className="text-blue-600">
                <strong>Discount:</strong> -{formatCurrency(discount)}
              </div>
            )}

             {/* Total Due After Discount */}
             <div className="font-semibold">
                 <strong>Total After Discount:</strong> {formatCurrency(totalDue)}
             </div>


            {/* Paid in green, Due in red */}
            <div>
              <strong className="text-green-600">Paid:</strong>{' '}
              <span className="text-green-600">{formatCurrency(paid)}</span>{' '}
              |{' '}
              <strong className="text-red-600">Due:</strong>{' '}
              <span className="text-red-600">{formatCurrency(remaining)}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('rentals','view') && (
            <button onClick={e=>{e.stopPropagation(); onView(row.original);}} title="View">
              <Eye className="h-4 w-4 text-blue-600 hover:text-blue-800"/>
            </button>
          )}
          {can('rentals','update') && (
            <>
              <button onClick={e=>{e.stopPropagation(); onEdit(row.original);}} title="Edit">
                <Edit className="h-4 w-4 text-blue-600 hover:text-blue-800"/>
              </button>
              {row.original.remainingAmount > 0 && (
                <>
                  <button onClick={e=>{e.stopPropagation(); onRecordPayment(row.original);}} title="Record Payment">
                    <DollarSign className="h-4 w-4 text-primary hover:text-primary-600"/>
                  </button>
                  <button onClick={e=>{e.stopPropagation(); onApplyDiscount(row.original);}} title="Apply Discount">
                    <Tag className="h-4 w-4 text-green-600 hover:text-green-800"/>
                  </button>
                </>
              )}
              {row.original.status==='active' && ( // Only allow completion for active rentals
                <button onClick={e=>{e.stopPropagation(); onComplete(row.original);}} title="Complete Return">
                  <RotateCw className="h-4 w-4 text-green-600 hover:text-green-800"/>
                </button>
              )}
            </>
          )}
          {can('rentals','delete') && row.original.status!=='active' && ( // Prevent deleting active rentals
            <button onClick={e=>{e.stopPropagation(); onDelete(row.original);}} title="Delete">
              <Trash2 className="h-4 w-4 text-red-600 hover:text-red-800"/>
            </button>
          )}
          {row.original.documents?.agreement && (
            <button onClick={e=>{e.stopPropagation(); onDownloadAgreement(row.original);}} title="Agreement">
              <FileText className="h-4 w-4 text-blue-600 hover:text-blue-800"/>
            </button>
          )}
          {row.original.documents?.invoice && (
            <button onClick={e=>{e.stopPropagation(); onDownloadInvoice(row.original);}} title="Invoice">
              <Download className="h-4 w-4 text-green-600 hover:text-green-800"/>
            </button>
          )}
        </div>
      ),
    },
  ];


  return (
    <DataTable
      data={sortedRentals}
      columns={columns}
      onRowClick={r => can('rentals','view') && onView(r)}
      rowClassName={r => {
        const now = new Date();
        // Highlight overdue rentals if they are active and past the end date
        if (r.status==='active' && isAfter(now, r.endDate)) return 'bg-red-50';
         // Highlight rentals ending within the next 30 days that are active or scheduled
        if ((r.status==='active' || r.status==='scheduled') && isWithinInterval(r.endDate, {start: now, end: addDays(now,30)}))
          return 'bg-yellow-50';
        return '';
      }}
    />
  );
};

export default RentalTable;