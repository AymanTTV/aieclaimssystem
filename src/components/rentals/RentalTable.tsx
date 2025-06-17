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
import { isAfter, differenceInDays, isWithinInterval, isBefore, addDays, differenceInHours } from 'date-fns';
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
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const days = isAfter(end, start) ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 1;

        return (
          <div>
            <div className="text-sm">{formatDate(r.startDate, true)}</div>
            <div className="text-sm text-gray-500">{formatDate(r.endDate, true)}</div>
            <div className="text-xs text-gray-500">
              {days} day{days === 1 ? '' : 's'}
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
      header: 'Cost Summary',
      cell: ({ row }) => {
        const r = row.original;
        const v = vehicles.find(v => v.id === r.vehicleId);
        if (!v) {
          return <div className="text-red-500 text-sm">Vehicle Not Found</div>;
        }

        const now = new Date();
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);

        // 1. Rate
        const baseRateFromVehicle = r.type === 'daily' ? v.dailyRentalPrice : (r.type === 'weekly' ? v.weeklyRentalPrice : v.claimRentalPrice);
        const defaultRate = RENTAL_RATES[r.type] || 0;
        const effectiveRate = r.negotiatedRate ?? baseRateFromVehicle ?? defaultRate;
        const isNegotiated = r.negotiatedRate != null;

        // 2. Period Calculation
        const totalHours = differenceInHours(end, start);
        const baseDays = totalHours <= 0 ? 1 : Math.ceil(totalHours / 24);
        const baseUnits = r.type === 'weekly' ? Math.ceil(baseDays / 7) : baseDays;
        const baseUnitString = r.type === 'weekly' ? 'week' : 'day';
        
        // 3. Ongoing Calculation
        const ongoingCost = r.status === 'active' && isAfter(now, r.endDate) ? calculateOverdueCost(r, now, v) : 0;
        let ongoingUnits = 0;
        if (ongoingCost > 0) {
            const overdueDays = Math.ceil((now.getTime() - r.endDate.getTime()) / (1000 * 60 * 60 * 24));
            ongoingUnits = r.type === 'weekly' ? Math.ceil(overdueDays / 7) : overdueDays;
        }
        
        // r.cost is the Total Amount Due after all charges and after discount.
        // So, to get the Subtotal before discount, we add the discount back.
        const costBeforeDiscountApplied = (r.cost || 0) + (r.discountAmount || 0) + ongoingCost;

        const totalDiscount = r.discountAmount || 0; // The explicit discount amount
        const totalAmountDue = (r.cost || 0) + ongoingCost; // Final cost shown on invoice after discount + any ongoing charges
        const paid = r.paidAmount || 0;
        const remaining = totalAmountDue - paid;
        
        // VAT calculation based on the total amount BEFORE any explicit discount.
        const vatAmount = r.includeVAT ? (costBeforeDiscountApplied) * (20/120) : 0;

        return (
          <div className="space-y-1 text-base"> {/* Changed text-sm to text-base */}
            {/* Rate */}
            <div className="flex justify-between">
              <span className="text-gray-500">Rate:</span>
              <span className="font-medium">{formatCurrency(effectiveRate)}/{baseUnitString}{isNegotiated && ' (N)'}</span>
            </div>

            {/* Base Period */}
            <div className="flex justify-between">
              <span className="text-gray-500">Period:</span>
              <span className="font-medium">{baseUnits} {baseUnitString}{baseUnits > 1 ? 's' : ''}</span>
            </div>

            {/* Ongoing Period */}
            {ongoingUnits > 0 && (
              <div className="flex justify-between text-red-600">
                <span className="text-red-500">Ongoing:</span>
                <span className="font-medium">{ongoingUnits} {baseUnitString}{ongoingUnits > 1 ? 's' : ''}</span>
              </div>
            )}
            
            <div className="border-t my-1"></div>

            {/* Subtotal (Base Cost + Ongoing + Discount amount re-added for full subtotal) */}
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal:</span>
              <span className="font-medium">{formatCurrency(costBeforeDiscountApplied)}</span>
            </div>

            {/* Discount */}
            {totalDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                    <span className="text-green-500">Discount:</span>
                    <span className="font-medium">-{formatCurrency(totalDiscount)}</span>
                </div>
            )}

            {/* Total Amount Due (after discount, before payments) */}
            <div className="flex justify-between">
              <span className="font-semibold">Total:</span>
              <span className="font-bold">{formatCurrency(totalAmountDue)}</span>
            </div>

            {/* VAT (displayed as included if applicable) */}
            {r.includeVAT && vatAmount > 0 && (
                 <div className="flex justify-between text-blue-600">
                    <span className="text-blue-500">VAT (Inc.):</span>
                    <span className="font-medium">{formatCurrency(vatAmount)}</span>
                 </div>
            )}

            <div className="border-t my-1"></div>

            {/* Paid */}
            <div className="flex justify-between text-green-700">
                <span className="font-semibold">Paid:</span>
                <span className="font-bold">{formatCurrency(paid)}</span>
            </div>

            {/* Due */}
            <div className="flex justify-between text-red-700">
                <span className="font-semibold">Due:</span>
                <span className="font-bold">{formatCurrency(remaining)}</span>
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
