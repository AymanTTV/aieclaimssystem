// src/components/maintenance/MaintenanceTable.tsx
import React, { useMemo, useState } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { MaintenanceLog, Vehicle, Customer, Rental } from '../../types';
import {
  Eye,
  Pencil,
  Trash2,
  FileText,
  CreditCard,
  CheckCircle2,
  Receipt,
  FileSignature,
  MessageCircle,
  Mail
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { format, differenceInCalendarDays } from 'date-fns';
import { usePermissions } from '../../hooks/usePermissions';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { useAuth } from '../../context/AuthContext';
import { useCustomers } from '../../hooks/useCustomers';
import { useRentals } from '../../hooks/useRentals';
import { useServiceCenters } from '../../hooks/useServiceCenters';
import {
  resolveMaintenanceContext,
  ResolvedMaintenanceContext,
  MaintenanceChannelMode,
  MaintenanceRecipientType,
} from '../../utils/maintenanceCommunication';
import MaintenanceRecipientSelectorModal from './MaintenanceRecipientSelectorModal';
import MaintenanceCommunicationModal from './MaintenanceCommunicationModal';
import MaintenanceBulkCommunicationModal from './MaintenanceBulkCommunicationModal';

interface MaintenanceTableProps {
  logs: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
  customers?: Record<string, Customer>;
  rentals?: Rental[];
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
  customers,
  rentals,
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
  const { customers: fallbackCustomers } = useCustomers();
  const { rentals: hookRentals } = useRentals();
  const { serviceCenters } = useServiceCenters();

  const activeRentals = useMemo(() => {
    return rentals && rentals.length > 0 ? rentals : hookRentals;
  }, [rentals, hookRentals]);

  const activeCustomersMap = useMemo(() => {
    if (customers && Object.keys(customers).length > 0) {
      return customers;
    }
    return fallbackCustomers.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as Record<string, Customer>);
  }, [customers, fallbackCustomers]);

  // Multi-selection state for bulk actions
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

  // Quick recipient selector modal state
  const [selectorState, setSelectorState] = useState<{
    isOpen: boolean;
    log: MaintenanceLog | null;
    context: ResolvedMaintenanceContext | null;
    mode: MaintenanceChannelMode;
  }>({
    isOpen: false,
    log: null,
    context: null,
    mode: 'whatsapp',
  });

  // Individual communication modal state
  const [commModal, setCommModal] = useState<{
    isOpen: boolean;
    log: MaintenanceLog | null;
    context: ResolvedMaintenanceContext | null;
    mode: MaintenanceChannelMode;
    recipientType: MaintenanceRecipientType;
  }>({
    isOpen: false,
    log: null,
    context: null,
    mode: 'whatsapp',
    recipientType: 'driver',
  });

  // Bulk communication modal state
  const [bulkModal, setBulkModal] = useState<{
    isOpen: boolean;
    mode: MaintenanceChannelMode;
  }>({
    isOpen: false,
    mode: 'email',
  });

  const handleOpenCommunication = (log: MaintenanceLog, mode: MaintenanceChannelMode) => {
    const ctx = resolveMaintenanceContext(log, vehicles, activeCustomersMap, serviceCenters, activeRentals);
    setSelectorState({
      isOpen: true,
      log,
      context: ctx,
      mode,
    });
  };

  const handleRecipientSelected = (recipientType: MaintenanceRecipientType) => {
    const { log, context, mode } = selectorState;
    setSelectorState({ isOpen: false, log: null, context: null, mode: 'whatsapp' });
    if (log && context) {
      setCommModal({
        isOpen: true,
        log,
        context,
        mode,
        recipientType,
      });
    }
  };

  const canSeeCompleted = can('maintenance', 'completed') && !isCompany;
  const canEditStatusFromTable = can('maintenance', 'tableStatus');

  const getStatusColor = (status: string, isScheduledUrgent?: boolean) => {
    if (status === 'scheduled' && isScheduledUrgent) {
      return 'text-red-900 bg-red-100 border-red-400 ring-red-400 font-bold';
    }
    switch (status) {
      case 'completed':
        return 'text-emerald-900 bg-emerald-100 border-emerald-400 ring-emerald-400 font-bold';
      case 'in-progress':
        return 'text-orange-950 bg-orange-100 border-orange-400 ring-orange-400 font-bold';
      case 'cancelled':
        return 'text-slate-700 bg-slate-100 border-slate-300 ring-slate-300';
      default:
        return 'text-blue-900 bg-blue-100 border-blue-300 ring-blue-300 font-bold';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    const t = String(type || '').toLowerCase();
    if (t.includes('service') || t.includes('routine') || t.includes('oil')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    }
    if (t.includes('mot') || t.includes('tfl') || t.includes('test')) {
      return 'bg-sky-50 text-sky-800 border-sky-300';
    }
    if (t.includes('repair') || t.includes('urgent') || t.includes('breakdown')) {
      return 'bg-rose-50 text-rose-800 border-rose-300';
    }
    if (t.includes('tyre') || t.includes('tire') || t.includes('brake')) {
      return 'bg-amber-50 text-amber-800 border-amber-300';
    }
    if (t.includes('inspection') || t.includes('check') || t.includes('safety')) {
      return 'bg-purple-50 text-purple-800 border-purple-300';
    }
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  const selectedLogsList = useMemo(() => {
    return logs.filter((l) => selectedLogIds.has(l.id));
  }, [logs, selectedLogIds]);

  const columns = useMemo(() => [
    {
      id: 'select',
      header: () => (
        <div className="w-6 flex items-center justify-center">
          <input
            type="checkbox"
            checked={logs.length > 0 && selectedLogIds.size === logs.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedLogIds(new Set(logs.map((l) => l.id)));
              } else {
                setSelectedLogIds(new Set());
              }
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
            title="Select all"
          />
        </div>
      ),
      cell: ({ row }: any) => (
        <div
          className="w-6 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selectedLogIds.has(row.original.id)}
            onChange={(e) => {
              const next = new Set(selectedLogIds);
              if (e.target.checked) {
                next.add(row.original.id);
              } else {
                next.delete(row.original.id);
              }
              setSelectedLogIds(next);
            }}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-3.5 h-3.5"
          />
        </div>
      ),
    },
    {
      id: 'orderNumber',
      header: <div className="w-16">Order #</div>,
      cell: ({ row }: any) => {
        const orderNum = row.original.orderNumber;
        return orderNum ? (
          <span
            className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded inline-block truncate max-w-[90px]"
            title={orderNum}
          >
            {orderNum}
          </span>
        ) : (
          <span className="font-mono text-xs text-slate-400 font-medium">-</span>
        );
      }
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
                className="font-bold text-slate-900 truncate"
                title={`${log.vehicleDetails.make} ${log.vehicleDetails.model}`}
              >
                {log.vehicleDetails.make} {log.vehicleDetails.model}
              </div>
              <div className="mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-black uppercase font-mono tracking-wider bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                  {log.vehicleDetails.registrationNumber}
                </span>
              </div>
            </div>
          );
        }

        const vehicle = vehicles[log.vehicleId!];
        
        if (vehicle) {
          return (
            <div className="max-w-[180px]">
              <div
                className="font-bold text-slate-900 truncate"
                title={`${vehicle.make} ${vehicle.model}`}
              >
                {vehicle.make} {vehicle.model}
              </div>
              <div className="mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-black uppercase font-mono tracking-wider bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                  {vehicle.registrationNumber}
                </span>
              </div>
            </div>
          );
        } else if (log.vehicleId) {
          return (
            <div className="max-w-[180px]">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 border border-red-200 mb-1">
                Deleted Vehicle
              </span>
              <div className="text-xs text-slate-500 truncate font-mono" title={log.vehicleId}>
                ID: {log.vehicleId.slice(0, 8)}...
              </div>
            </div>
          );
        } else {
          return <span className="text-slate-400 font-medium">N/A</span>;
        }
      }
    },
    {
      id: 'type',
      header: <div className="w-24">Type</div>,
      cell: ({ row }: any) => {
        const typeStr = row.original.type || '';
        const badgeColor = getTypeBadgeColor(typeStr);
        const isTest = typeStr === 'mot' || typeStr === 'tfl';
        return (
          <div className="w-24">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold capitalize border truncate max-w-full ${badgeColor}`}
              title={typeStr.replace(/-/g, ' ')}
            >
              {typeStr.replace(/-/g, ' ')}
            </span>
            {isTest && (
              <span className="ml-1 text-[10px] bg-sky-100 text-sky-800 font-bold px-1 py-0.5 rounded border border-sky-200">
                Test
              </span>
            )}
          </div>
        );
      }
    },
    {
      id: 'date',
      header: <div className="w-32">Date & Time</div>, // ✅ Increased width to accommodate time
      cell: ({ row }: any) => {
        const d = row.original.date;
        const status = row.original.status;
        const isScheduled = status === 'scheduled';
        const isInProgress = status === 'in-progress';
        const isCompleted = status === 'completed';
        const isCancelled = status === 'cancelled';
        const days = differenceInCalendarDays(d, new Date());

        let badge: React.ReactNode = null;
        let dateTextColor = 'text-slate-700';

        if (isScheduled) {
          if (days < 0) {
            dateTextColor = 'text-red-700 font-bold';
            badge = (
              <span className="inline-flex items-center rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-black shadow-xs">
                {`${Math.abs(days)}d Overdue`}
              </span>
            );
          } else if (days === 0) {
            dateTextColor = 'text-red-700 font-bold';
            badge = (
              <span className="inline-flex items-center rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-black shadow-xs animate-pulse">
                Due Today!
              </span>
            );
          } else if (days <= 7) {
            dateTextColor = 'text-red-700 font-bold';
            badge = (
              <span className="inline-flex items-center rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-black shadow-xs">
                {days === 1 ? 'Due Tmrw' : `Due in ${days}d`}
              </span>
            );
          } else {
            dateTextColor = 'text-blue-800 font-semibold';
            badge = (
              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 border border-blue-200 px-1.5 py-0.2 text-[10px] font-medium">
                {`In ${days}d`}
              </span>
            );
          }
        } else if (isInProgress) {
          dateTextColor = 'text-orange-700 font-bold';
          badge = (
            <span className="inline-flex items-center rounded-full bg-orange-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
              In Progress
            </span>
          );
        } else if (isCompleted) {
          dateTextColor = 'text-emerald-700 font-semibold';
        } else if (isCancelled) {
          dateTextColor = 'text-slate-400 line-through';
        }

        return (
          <div className="flex flex-col w-32">
            {/* Color-coded date text reflecting its schedule state */}
            <span className={`text-sm ${dateTextColor}`}>
              {format(d, 'dd/MM/yyyy HH:mm')}
            </span>
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
        const isScheduledUrgent =
          log.status === 'scheduled' &&
          log.date &&
          differenceInCalendarDays(new Date(log.date), new Date()) <= 7;

        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
          const val = e.target.value;
          if (val === 'completed') {
            onComplete(log);
          } else {
            onStatusChange(log, val);
          }
        };

        return (
          <div className="space-y-1.5 w-28" onClick={(e) => e.stopPropagation()}>
            {canEditStatusFromTable ? (
              <select
                value={log.status}
                onChange={handleChange}
                className={`block w-full text-xs font-bold rounded-md border py-1 pl-2 pr-6 ring-1 ring-inset shadow-2xs sm:text-xs sm:leading-6 ${getStatusColor(
                  log.status,
                  isScheduledUrgent
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
              <div className="pl-0.5">
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
          <div className="font-bold text-slate-900 truncate" title={row.original.serviceProvider}>
            {row.original.serviceProvider}
          </div>
          <div className="text-xs text-slate-500 truncate" title={row.original.location}>
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
            <div className="flex justify-between font-bold text-[#D97706] border-b border-slate-200/80 pb-0.5">
              <span>Total:</span>
              <span className="font-mono">{formatCurrency(cost)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#15803D]">
              <span>Paid:</span>
              <span className="font-mono">{formatCurrency(paidAmount)}</span>
            </div>
            <div
              className={`flex justify-between font-bold ${
                remainingAmount > 0.001
                  ? 'text-[#DC2626]'
                  : 'text-[#15803D]'
              }`}
            >
              <span>Owing:</span>
              <span className="font-mono">{formatCurrency(remainingAmount)}</span>
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

          {/* Email and WhatsApp action bar options */}
          <div className="flex gap-1 mt-1 pt-1 border-t w-full justify-center border-gray-200">
            <ActionBtn
              onClick={() => handleOpenCommunication(row.original, 'whatsapp')}
              icon={MessageCircle}
              colorClass="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200"
              title="WhatsApp: Send to Driver or Garage"
            />
            <ActionBtn
              onClick={() => handleOpenCommunication(row.original, 'email')}
              icon={Mail}
              colorClass="text-sky-700 bg-sky-50 hover:bg-sky-100 hover:text-sky-800 border border-sky-200"
              title="Email: Send to Driver or Garage"
            />
          </div>
        </div>
      )
    }
  ].filter(Boolean), [vehicles, canEditStatusFromTable, isCompany, canSeeCompleted, onView, onEdit, onComplete, onPay, onDelete, onGenerateDocument, onViewDocument, onGenerateInvoice, onStatusChange, formatCurrency, can, selectedLogIds, logs, activeCustomersMap, serviceCenters]);

  const [activeHighlightFilter, setActiveHighlightFilter] = useState<'all' | 'due7d' | 'in-progress'>('all');

  const due7dCount = useMemo(() => {
    return logs.filter(log => {
      if (log.status !== 'scheduled' || !log.date) return false;
      const days = differenceInCalendarDays(new Date(log.date), new Date());
      return days <= 7;
    }).length;
  }, [logs]);

  const inProgressCount = useMemo(() => {
    return logs.filter(log => log.status === 'in-progress').length;
  }, [logs]);

  const displayedLogs = useMemo(() => {
    if (activeHighlightFilter === 'due7d') {
      return logs.filter(log => {
        if (log.status !== 'scheduled' || !log.date) return false;
        const days = differenceInCalendarDays(new Date(log.date), new Date());
        return days <= 7;
      });
    }
    if (activeHighlightFilter === 'in-progress') {
      return logs.filter(log => log.status === 'in-progress');
    }
    return logs;
  }, [logs, activeHighlightFilter]);

  const rowClassName = (row: { original: MaintenanceLog }) => {
    const { date, status } = row.original;

    // 1. Due in ≤7d (highlight Red)
    if (status === 'scheduled') {
      if (date) {
        const days = differenceInCalendarDays(new Date(date), new Date());
        if (days <= 7) {
          return '!bg-[#FEE2E2] hover:!bg-[#FECACA] text-slate-900 [&>td]:!bg-[#FEE2E2] hover:[&>td]:!bg-[#FECACA] [&>td]:!border-red-300 [&>td:first-child]:!border-l-4 [&>td:first-child]:!border-l-red-600 transition-colors duration-150';
        }
      }
      return '';
    }

    // 2. In Progress (highlight Orange)
    if (status === 'in-progress') {
      return '!bg-[#FFEDD5] hover:!bg-[#FED7AA] text-slate-900 [&>td]:!bg-[#FFEDD5] hover:[&>td]:!bg-[#FED7AA] [&>td]:!border-orange-300 [&>td:first-child]:!border-l-4 [&>td:first-child]:!border-l-orange-500 transition-colors duration-150';
    }

    // All other: no colour!
    return '';
  };

  return (
    <>
      {selectedLogIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3 mb-4 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-3">
            <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-full">
              {selectedLogIds.size} {selectedLogIds.size === 1 ? 'record' : 'records'} selected
            </span>
            <span className="text-xs text-blue-700 hidden sm:inline font-medium">
              Perform batch communications for selected maintenance jobs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkModal({ isOpen: true, mode: 'whatsapp' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              title="Send batch WhatsApp to drivers or garages"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Batch WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setBulkModal({ isOpen: true, mode: 'email' })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              title="Send batch Email to drivers or garages"
            >
              <Mail className="w-3.5 h-3.5" />
              Batch Email
            </button>
            <button
              type="button"
              onClick={() => setSelectedLogIds(new Set())}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Color Status Legend with Interactive Dynamic Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 bg-[#F1F5F9] border border-[#E2E8F0] rounded-2xl shadow-xs text-xs mb-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <span className="text-[#475569] font-bold uppercase tracking-wider text-[11px]">Row Indicators:</span>
          <button
            type="button"
            onClick={() => setActiveHighlightFilter(prev => prev === 'due7d' ? 'all' : 'due7d')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeHighlightFilter === 'due7d'
                ? 'bg-[#FEE2E2] border border-red-400 ring-2 ring-red-300 text-[#B91C1C] shadow-xs'
                : 'bg-[#FEE2E2] hover:bg-[#FECACA] border border-red-200 text-[#B91C1C]'
            }`}
            title="Click to filter: Show only jobs due in ≤7 days"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-[#B91C1C] border border-red-300 inline-block shadow-xs animate-pulse"></span>
            <span className="font-bold">Due in ≤7d</span>
            <span className="bg-[#B91C1C] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
              {due7dCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveHighlightFilter(prev => prev === 'in-progress' ? 'all' : 'in-progress')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeHighlightFilter === 'in-progress'
                ? 'bg-[#FEF3C7] border border-amber-400 ring-2 ring-amber-300 text-[#B45309] shadow-xs'
                : 'bg-[#FEF3C7] hover:bg-[#FDE68A] border border-amber-200 text-[#B45309]'
            }`}
            title="Click to filter: Show only jobs in progress"
          >
            <span className="w-3.5 h-3.5 rounded-full bg-[#B45309] border border-amber-300 inline-block shadow-xs"></span>
            <span className="font-bold">In Progress</span>
            <span className="bg-[#B45309] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs">
              {inProgressCount}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeHighlightFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveHighlightFilter('all')}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
            >
              Reset Filter
            </button>
          )}
          <span className="text-[#475569] text-xs">
            Showing <strong className="text-slate-900 font-mono">{displayedLogs.length}</strong> of <span className="font-mono text-slate-700">{logs.length}</span> jobs
          </span>
        </div>
      </div>

      <DataTable
        data={displayedLogs} 
        columns={columns as any}
        onRowClick={(log) => can('maintenance', 'view') && onView(log)}
        rowClassName={rowClassName as any}
        separatedRows={true}
      />

      {/* Recipient Quick Selector Modal ("Send to Driver" OR "Send to Garage") */}
      <MaintenanceRecipientSelectorModal
        isOpen={selectorState.isOpen}
        onClose={() => setSelectorState({ isOpen: false, log: null, context: null, mode: 'whatsapp' })}
        log={selectorState.log}
        context={selectorState.context}
        mode={selectorState.mode}
        onSelectRecipient={handleRecipientSelected}
      />

      {/* Maintenance Single Communication Modal */}
      <MaintenanceCommunicationModal
        isOpen={commModal.isOpen}
        onClose={() => setCommModal({ isOpen: false, log: null, context: null, mode: 'whatsapp', recipientType: 'driver' })}
        log={commModal.log}
        context={commModal.context}
        initialMode={commModal.mode}
        initialRecipient={commModal.recipientType}
      />

      {/* Maintenance Bulk Communication Modal */}
      <MaintenanceBulkCommunicationModal
        isOpen={bulkModal.isOpen}
        onClose={() => setBulkModal({ isOpen: false, mode: 'email' })}
        selectedLogs={selectedLogsList}
        vehiclesMap={vehicles}
        customersMap={activeCustomersMap}
        serviceCenters={serviceCenters}
        rentals={activeRentals}
        initialMode={bulkModal.mode}
      />
    </>
  );
};

export default MaintenanceTable;