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

  // Sort rentals by end date (closest first)
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
        const v = vehicles.find(v => v.id === r.vehicleId)!;
        const now = new Date();

        // days × per-day rate
        const days = differenceInDays(r.endDate, r.startDate) + 1;
        const perDayRate = r.negotiatedRate
          ?? v.claimRentalPrice
          ?? RENTAL_RATES.claim;
        const baseCost = days * perDayRate;

        // overdue
        const ongoing = r.status === 'active' && isAfter(now, r.endDate)
          ? calculateOverdueCost(r, now, v)
          : 0;

        const discount = r.discountAmount || 0;
        // rental.cost is finalCostToSave (after discount, before overdue)
        const totalDue = (r.cost || baseCost) + ongoing;
        const paid = r.paidAmount || 0;
        const remaining = totalDue - paid;

        return (
          <div className="space-y-1">
            <div className="font-medium">{formatCurrency(baseCost)}</div>

            {discount > 0 && (
              <div className="text-xs text-green-600">
                Discount: -{formatCurrency(discount)}
              </div>
            )}

            {ongoing > 0 && (
              <div className="text-xs text-red-600">
                +{formatCurrency(ongoing)} Ongoing
              </div>
            )}

            <div className="font-medium">{formatCurrency(totalDue)}</div>

            <div className="text-xs text-green-600">
              Paid: {formatCurrency(paid)}
            </div>

            {remaining > 0 && (
              <div className="text-xs text-red-600">
                Due: {formatCurrency(remaining)}
              </div>
            )}
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
              {row.original.status==='completed' && !row.original.returnCondition && (
                <button onClick={e=>{e.stopPropagation(); onComplete(row.original);}} title="Complete Return">
                  <RotateCw className="h-4 w-4 text-green-600 hover:text-green-800"/>
                </button>
              )}
            </>
          )}
          {can('rentals','delete') && row.original.status!=='active' && (
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
        if (r.status==='active' && isAfter(now, r.endDate)) return 'bg-red-50';
        if (r.status==='active' && isWithinInterval(r.endDate, {start: now, end: addDays(now,30)}))
          return 'bg-yellow-50';
        return '';
      }}
    />
  );
};

export default RentalTable;
