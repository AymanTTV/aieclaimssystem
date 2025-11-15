// src/components/maintenance/MaintenanceTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { MaintenanceLog, Vehicle } from '../../types';
import { Eye, Edit as EditIcon, Trash2, FileText, DollarSign } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { format, differenceInCalendarDays } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface MaintenanceTableProps {
  logs: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
  onView: (log: MaintenanceLog) => void;
  onEdit: (log: MaintenanceLog) => void;
  onDelete: (log: MaintenanceLog) => void;
  onGenerateDocument: (log: MaintenanceLog) => void;
  onViewDocument: (url: string) => void;
  onPay: (log: MaintenanceLog) => void;
}

const MaintenanceTable: React.FC<MaintenanceTableProps> = ({
  logs,
  vehicles,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onPay
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const columns = [
    {
    header: 'Vehicle',
    cell: ({ row }) => {
      const log = row.original;

      // Case 1: Manually entered vehicle details exist on the log
      if (log.vehicleDetails) {
        return (
          <div>
            <div className="font-medium">
              {log.vehicleDetails.make} {log.vehicleDetails.model}
            </div>
            <div className="text-sm text-gray-500">
              {log.vehicleDetails.registrationNumber}
            </div>
          </div>
        );
      }

      // Case 2 (Fallback): Vehicle from the main list
      const vehicle = vehicles[log.vehicleId!]; // Use ! because we know vehicleId exists here
      return vehicle ? (
        <div>
          <div className="font-medium">{vehicle.make} {vehicle.model}</div>
          <div className="text-sm text-gray-500">{vehicle.registrationNumber}</div>
        </div>
      ) : (
        'N/A'
      );
    },
  },
    {
      header: 'Type',
      cell: ({ row }) => (
        <div>
          <span className="capitalize">{row.original.type.replace('-', ' ')}</span>
          {(row.original.type === 'mot' || row.original.type === 'tfl') && (
            <span className="ml-1 text-sm text-gray-500">Test</span>
          )}
        </div>
      ),
    },
    {
      header: 'Date',
      cell: ({ row }) => {
        const d = row.original.date;
        const isScheduled = row.original.status === 'scheduled';
        const days = differenceInCalendarDays(d, new Date());

        // Always RED for scheduled items that are overdue/today/<= 7 days away
        let badge: React.ReactNode = null;
        if (isScheduled) {
          if (days < 0) {
            badge = (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">
                {`${Math.abs(days)}d overdue`}
              </span>
            );
          } else if (days === 0) {
            badge = (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">
                Today
              </span>
            );
          } else if (days <= 7) {
            badge = (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">
                {days === 1 ? 'Tomorrow' : `In ${days} days`}
              </span>
            );
          }
        }

        return (
          <div className="flex items-center">
            <span>{format(d, 'dd/MM/yyyy')}</span>
            {badge}
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
      header: 'Service Provider',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.serviceProvider}</div>
          <div className="text-sm text-gray-500">{row.original.location}</div>
        </div>
      ),
    },
    {
      header: 'Cost',
      cell: ({ row }) => {
        const {
          netAmount,
          vatAmount,
          totalDiscount = 0,
          cost,
          paidAmount = 0,
          remainingAmount,
        } = row.original;

        return (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>NET:</span>
              <span>{formatCurrency(netAmount!)}</span>
            </div>
            <div className="flex justify-between">
              <span>VAT:</span>
              <span>{formatCurrency(vatAmount!)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount:</span>
                <span>–{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>{formatCurrency(cost)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid:</span>
              <span>{formatCurrency(paidAmount)}</span>
            </div>
            <div className="flex justify-between text-amber-600">
              <span>Owing:</span>
              <span>{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('maintenance', 'view') && (
            <button
              onClick={e => {
                e.stopPropagation();
                onView(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {can('maintenance','update') && (
            <button
              onClick={e=>{ e.stopPropagation(); onPay(row.original); }}
              className="text-green-600 hover:text-green-800"
              title="Record Payment"
            >
              <DollarSign className="h-4 w-4" />
            </button>
          )}
          {can('maintenance', 'update') && (
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <EditIcon className="h-4 w-4" />
            </button>
          )}
          {can('maintenance', 'delete') && (
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {can('maintenance', 'update') && (
            <button
              onClick={e => {
                e.stopPropagation();
                onGenerateDocument(row.original);
              }}
              className="text-green-600 hover:text-green-800"
              title="Generate Document"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
          {row.original.documentUrl && (
            <button
              onClick={e => {
                e.stopPropagation();
                onViewDocument(row.original.documentUrl!);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Document"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Optional whole-row highlighting (depends on DataTable support)
  const rowClassName = (row: { original: MaintenanceLog }) => {
    const { date, status } = row.original;
    if (status === 'scheduled') {
      const days = differenceInCalendarDays(date, new Date());
      if (days <= 7) {
        // includes overdue (negative), today (0), and next 7 days (1..7)
        return 'bg-red-50 hover:bg-red-100';
      }
    }
    return '';
  };

  return (
    <DataTable
      data={logs}
      columns={columns}
      onRowClick={log => can('maintenance', 'view') && onView(log)}
      // If your DataTable supports custom row classes, this will highlight the whole row:
      rowClassName={rowClassName as any}
    />
  );
};

export default MaintenanceTable;
