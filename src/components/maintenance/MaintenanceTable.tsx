// src/components/maintenance/MaintenanceTable.tsx
import React, { useMemo } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { MaintenanceLog, Vehicle } from '../../types';
import {
  Eye,
  Pencil,
  Trash2,
  FileText,
  CreditCard,
  CheckCircle2,
  Receipt,
  FileSignature
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { format, differenceInCalendarDays } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';

interface MaintenanceTableProps {
  logs: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
  onView: (log: MaintenanceLog) => void;
  onEdit: (log: MaintenanceLog) => void;
  onDelete: (log: MaintenanceLog) => void;
  onGenerateDocument: (log: MaintenanceLog) => void;
  onViewDocument: (url: string) => void;
  onPay: (log: MaintenanceLog) => void;
  onComplete: (log: MaintenanceLog) => void;
  onGenerateInvoice: (log: MaintenanceLog) => void;
  onStatusChange: (log: MaintenanceLog, newStatus: string) => void;
}

const ActionBtn = ({
  onClick,
  icon: Icon,
  colorClass,
  title
}: {
  onClick: (e: React.MouseEvent) => void;
  icon: any;
  colorClass: string;
  title: string;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    title={title}
    className={`p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all flex items-center justify-center w-8 h-8 ${colorClass}`}
  >
    <Icon className="h-4 w-4" />
  </button>
);

const MaintenanceTable: React.FC<MaintenanceTableProps> = ({
  logs,
  vehicles,
  onView,
  onEdit,
  onDelete,
  onGenerateDocument,
  onViewDocument,
  onPay,
  onComplete,
  onGenerateInvoice,
  onStatusChange
}) => {
  const { can, isCompany } = usePermissions();
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();

  const canSeeCompleted = can('maintenance', 'completed') && !isCompany;
  const canEditStatusFromTable = can('maintenance', 'tableStatus');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'in-progress':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'cancelled':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    }
  };

  const columns = useMemo(() => [
    {
      id: 'orderNumber',
      header: <div className="w-16">Order #</div>,
      cell: ({ row }: any) => (
        <span className="font-mono text-xs font-medium text-gray-500 block truncate">
          {row.original.orderNumber || '-'}
        </span>
      )
    },
    {
      id: 'vehicle',
      header: <div className="min-w-[140px]">Vehicle</div>,
      cell: ({ row }: any) => {
        const log = row.original;
        
        if (log.vehicleDetails) {
          return (
            <div className="max-w-[180px]">
              <div
                className="font-medium text-gray-900 truncate"
                title={`${log.vehicleDetails.make} ${log.vehicleDetails.model}`}
              >
                {log.vehicleDetails.make} {log.vehicleDetails.model}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {log.vehicleDetails.registrationNumber}
              </div>
            </div>
          );
        }

        const vehicle = vehicles[log.vehicleId!];
        
        if (vehicle) {
          return (
            <div className="max-w-[180px]">
              <div
                className="font-medium text-gray-900 truncate"
                title={`${vehicle.make} ${vehicle.model}`}
              >
                {vehicle.make} {vehicle.model}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {vehicle.registrationNumber}
              </div>
            </div>
          );
        } else if (log.vehicleId) {
          return (
            <div className="max-w-[180px]">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200 mb-1">
                Deleted Vehicle
              </span>
              <div className="text-xs text-gray-500 truncate font-mono" title={log.vehicleId}>
                ID: {log.vehicleId.slice(0, 8)}...
              </div>
            </div>
          );
        } else {
          return <span className="text-gray-400">N/A</span>;
        }
      }
    },
    {
      id: 'type',
      header: <div className="w-24">Type</div>,
      cell: ({ row }: any) => (
        <div className="w-24">
          <span
            className="capitalize text-gray-700 font-medium block truncate"
            title={row.original.type.replace('-', ' ')}
          >
            {row.original.type.replace('-', ' ')}
          </span>
          {(row.original.type === 'mot' || row.original.type === 'tfl') && (
            <span className="ml-1 text-[10px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded border border-gray-200">
              Test
            </span>
          )}
        </div>
      )
    },
    {
      id: 'date',
      header: <div className="w-28">Date</div>,
      cell: ({ row }: any) => {
        const d = row.original.date;
        const isScheduled = row.original.status === 'scheduled';
        const days = differenceInCalendarDays(d, new Date());

        let badge: React.ReactNode = null;
        if (isScheduled) {
          if (days < 0) {
            badge = (
              <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 px-1.5 py-0.5 text-[10px] font-medium ml-1">
                {`${Math.abs(days)}d O/D`}
              </span>
            );
          } else if (days === 0) {
            badge = (
              <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-800 px-1.5 py-0.5 text-[10px] font-medium ml-1">
                Today
              </span>
            );
          } else if (days <= 7) {
            badge = (
              <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 px-1.5 py-0.5 text-[10px] font-medium ml-1">
                {days === 1 ? 'Tmrw' : `${days}d`}
              </span>
            );
          }
        }

        return (
          <div className="flex flex-col w-28">
            <span className="text-sm text-gray-700">{format(d, 'dd/MM/yyyy')}</span>
            <div className="h-4">{badge}</div>
          </div>
        );
      }
    },
    
    {
      id: 'status',
      header: <div className="w-28">Status</div>,
      cell: ({ row }: any) => {
        const log = row.original;

        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
          const val = e.target.value;
          if (val === 'completed') {
            onComplete(log);
          } else {
            onStatusChange(log, val);
          }
        };

        return (
          <div className="space-y-1 w-28" onClick={(e) => e.stopPropagation()}>
            {canEditStatusFromTable ? (
              <select
                value={log.status}
                onChange={handleChange}
                className={`block w-full text-xs font-medium rounded-md border-0 py-1 pl-2 pr-6 ring-1 ring-inset focus:ring-2 focus:ring-primary sm:text-xs sm:leading-6 ${getStatusColor(
                  log.status
                )}`}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                {can('maintenance', 'complete') && (
                  <option value="completed">Completed</option>
                )}
                {canSeeCompleted && (
                  <option value="cancelled">Cancelled</option>
                )}
              </select>
            ) : (
              <StatusBadge status={log.status} />
            )}

            {!isCompany && (
              <div className="pl-1">
                <StatusBadge status={log.paymentStatus} />
              </div>
            )}
          </div>
        );
      }
    },
    {
      id: 'provider',
      header: <div className="w-32">Provider</div>,
      cell: ({ row }: any) => (
        <div className="max-w-[140px]">
          <div className="font-medium text-gray-900 truncate" title={row.original.serviceProvider}>
            {row.original.serviceProvider}
          </div>
          <div className="text-xs text-gray-500 truncate" title={row.original.location}>
            {row.original.location}
          </div>
        </div>
      )
    },
    !isCompany ? {
      id: 'cost',
      header: <div className="w-28">Cost</div>,
      cell: ({ row }: any) => {
        const { cost, paidAmount = 0, remainingAmount } = row.original;
        return (
          <div className="space-y-0.5 text-xs w-28">
            <div className="flex justify-between font-bold text-gray-900 border-b border-gray-100 pb-0.5">
              <span>Total:</span>
              <span>{formatCurrency(cost)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid:</span>
              <span>{formatCurrency(paidAmount)}</span>
            </div>
            <div
              className={`flex justify-between font-medium ${
                remainingAmount > 0 ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              <span>Owing:</span>
              <span>{formatCurrency(remainingAmount)}</span>
            </div>
          </div>
        );
      }
    } : null,
    {
      id: 'actions',
      header: <div className="w-10 text-center">Actions</div>,
      cell: ({ row }: any) => (
        <div className="flex flex-col gap-1 items-center justify-center w-10">
          {can('maintenance', 'view') && (
            <ActionBtn
              onClick={() => onView(row.original)}
              icon={Eye}
              colorClass="text-blue-600"
              title="View Details"
            />
          )}

          {can('maintenance', 'update') && (
            <ActionBtn
              onClick={() => onEdit(row.original)}
              icon={Pencil}
              colorClass="text-indigo-600"
              title="Edit"
            />
          )}

          <div className="flex gap-1">
            {row.original.status !== 'completed' && can('maintenance', 'complete') && (
              <ActionBtn
                onClick={() => onComplete(row.original)}
                icon={CheckCircle2}
                colorClass="text-orange-600"
                title="Complete Maintenance"
              />
            )}
            
            {!isCompany && can('maintenance', 'recordPayment') && (
              <ActionBtn
                onClick={() => onPay(row.original)}
                icon={CreditCard}
                colorClass="text-emerald-600"
                title="Record Payment"
              />
            )}
          </div>

          {can('maintenance', 'delete') && (
            <ActionBtn
              onClick={() => onDelete(row.original)}
              icon={Trash2}
              colorClass="text-red-600 hover:bg-red-50"
              title="Delete"
            />
          )}

          <div className="flex gap-1 mt-1 pt-1 border-t w-full justify-center border-gray-200">
            {can('maintenance', 'singleDoc') && (
              <>
                {row.original.documentUrl ? (
                  <ActionBtn
                    onClick={() => onViewDocument(row.original.documentUrl!)}
                    icon={FileText}
                    colorClass="text-blue-700"
                    title="View Work Order"
                  />
                ) : (
                  <ActionBtn
                    onClick={() => onGenerateDocument(row.original)}
                    icon={FileSignature}
                    colorClass="text-blue-600"
                    title="Generate Work Order"
                  />
                )}
                
                {!isCompany && (
                  <ActionBtn
                    onClick={() => onGenerateInvoice(row.original)}
                    icon={Receipt}
                    colorClass={row.original.invoiceUrl ? 'text-green-700' : 'text-gray-400 hover:text-green-600'}
                    title="Generate/Regenerate Invoice"
                  />
                )}
              </>
            )}
          </div>
        </div>
      )
    }
  ].filter(Boolean), [vehicles, canEditStatusFromTable, isCompany, canSeeCompleted, onView, onEdit, onComplete, onPay, onDelete, onGenerateDocument, onViewDocument, onGenerateInvoice, onStatusChange, formatCurrency, can]);

  const rowClassName = (row: { original: MaintenanceLog }) => {
    const { date, status } = row.original;
    if (status === 'scheduled') {
      const days = differenceInCalendarDays(date, new Date());
      if (days <= 7) return '!bg-red-50 hover:!bg-red-100 transition-colors duration-200';
    }
    return '';
  };

  return (
    <DataTable
      // ✅ FIX: Use logs directly, as filtering is fully handled by useMaintenanceFilters now
      data={logs} 
      columns={columns as any}
      onRowClick={(log) => can('maintenance', 'view') && onView(log)}
      rowClassName={rowClassName as any}
    />
  );
};

export default MaintenanceTable;