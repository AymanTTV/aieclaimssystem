// src/components/maintenance/MaintenanceTable.tsx
import React, { useMemo, useState } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { MaintenanceLog, Vehicle, Customer, Rental, isOffRoadAccidentLog } from '../../types';
import { derivePaymentStatus } from '../../utils/paymentStatusHelper';
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
  Mail,
  AlertTriangle
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
import { calculateProfitMetrics } from '../../utils/profitCalculator';
import {
  normalizeMaintenanceStatus,
  getMaintenanceStatusLabel,
  isStatusOffRoad,
  getStatusBadgeStyles,
  getMaintenanceRowTheme,
} from '../../utils/maintenanceStatusConfig';
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
  activeCustomersMap?: Record<string, Customer>;
  serviceCenters?: ServiceCenter[];
  activeRentals?: Rental[];
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  roadConditionFilter?: string;
  onRoadConditionFilterChange?: (condition: string) => void;
  offRoadAccidentCount?: number;
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
  onStatusChange,
  statusFilter,
  onStatusFilterChange,
  roadConditionFilter,
  onRoadConditionFilterChange,
  offRoadAccidentCount
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

  const getStatusColor = (
    status: string,
    isScheduledUrgent?: boolean,
    isAccident?: boolean,
    isOffRoad?: boolean
  ) => {
    return getStatusBadgeStyles(status, {
      isScheduledUrgent,
      isDarkTheme: false,
      isAccident,
      isOffRoad,
    });
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
        const isAccidentOffRoad = isOffRoadAccidentLog(log);
        
        if (log.vehicleDetails) {
          return (
            <div className="max-w-[180px]">
              <div
                className="font-bold text-slate-900 truncate"
                title={`${log.vehicleDetails.make} ${log.vehicleDetails.model}`}
              >
                {log.vehicleDetails.make} {log.vehicleDetails.model}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-black uppercase font-mono tracking-wider bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                  {log.vehicleDetails.registrationNumber}
                </span>
                {isAccidentOffRoad && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider border ${
                    log.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                    {log.status === 'completed' ? 'Repaired' : 'Off-Road (Accident)'}
                  </span>
                )}
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
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-black uppercase font-mono tracking-wider bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                  {vehicle.registrationNumber}
                </span>
                {isAccidentOffRoad && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider border ${
                    log.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                    {log.status === 'completed' ? 'Repaired' : 'Off-Road (Accident)'}
                  </span>
                )}
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
        const isWorkshop = status === 'workshop';
        const isPartsBackorder = status === 'parts-backorder';
        const isBodywork = status === 'bodywork';
        const isOffRoad = (status === 'off-road' || status === 'OFF ROAD (VOR)' || status === 'vor') || (!status && isOffRoadAccidentLog(row.original));
        const isPending = status === 'pending';
        const isInspection = status === 'inspection';
        const isCompleted = status === 'completed';
        const isCancelled = status === 'cancelled';

        if (!d) {
          if (isPartsBackorder) {
            return (
              <div className="flex flex-col w-32">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800">
                  Awaiting Parts
                </span>
                <span className="text-[10px] text-amber-600 font-medium">Date not required</span>
              </div>
            );
          }
          if (isOffRoad) {
            return (
              <div className="flex flex-col w-32">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700">
                  OFF ROAD (VOR)
                </span>
                <span className="text-[10px] text-rose-600 font-medium">Incident Report</span>
              </div>
            );
          }
          return (
            <div className="flex flex-col w-32">
              <span className="text-xs text-slate-400 font-medium">Date not set</span>
            </div>
          );
        }

        const validDate = d instanceof Date ? d : new Date(d);
        const isValid = !isNaN(validDate.getTime());
        const days = isValid ? differenceInCalendarDays(validDate, new Date()) : 0;

        let badge: React.ReactNode = null;
        let dateTextColor = 'text-slate-700';

        if (isOffRoad && !isCompleted && !isCancelled) {
          dateTextColor = 'text-rose-800 font-bold';
          badge = (
            <span className="inline-flex items-center rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-black shadow-xs">
              OFF ROAD (VOR)
            </span>
          );
        } else if (isPartsBackorder) {
          dateTextColor = 'text-amber-800 font-semibold';
          badge = (
            <span className="inline-flex items-center rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
              Awaiting Parts (TBD)
            </span>
          );
        } else if (isWorkshop) {
          dateTextColor = 'text-purple-800 font-semibold';
          badge = (
            <span className="inline-flex items-center rounded-full bg-purple-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
              In Workshop
            </span>
          );
        } else if (isBodywork) {
          dateTextColor = 'text-indigo-800 font-semibold';
          badge = (
            <span className="inline-flex items-center rounded-full bg-indigo-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
              Bodywork
            </span>
          );
        } else if (isPending) {
          dateTextColor = 'text-yellow-800 font-semibold';
          badge = (
            <span className="inline-flex items-center rounded-full bg-yellow-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
              Pending Approval
            </span>
          );
        } else if (isInspection) {
          dateTextColor = 'text-sky-800 font-semibold';
          badge = (
            <span className="inline-flex items-center rounded-full bg-sky-600 text-white px-2 py-0.5 text-[10px] font-bold shadow-xs">
              Inspection / MOT
            </span>
          );
        } else if (isScheduled) {
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
              <span className="inline-flex items-center rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-black shadow-xs">
                Due Today
              </span>
            );
          } else if (days <= 7) {
            dateTextColor = 'text-red-700 font-bold';
            badge = (
              <span className="inline-flex items-center rounded-full bg-red-600 text-white px-2 py-0.5 text-[10px] font-black shadow-xs">
                {days === 1 ? 'Due in 1d' : `Due in ${days}d`}
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
              {isValid ? format(validDate, 'dd/MM/yyyy HH:mm') : '-'}
            </span>
            <div className="h-4">{badge}</div>
          </div>
        );
      }
    },
    
    {
      id: 'status',
      header: <div className="w-36 min-w-[140px]">Status</div>,
      cell: ({ row }: any) => {
        const log = row.original;
        const isAccidentOffRoad = isOffRoadAccidentLog(log) || normalizeMaintenanceStatus(log.status) === 'accident';
        const isOffRoad = isStatusOffRoad(log.status, { isAccident: isAccidentOffRoad, isOffRoad: log.isOffRoad });
        const isScheduledUrgent =
          log.status === 'scheduled' &&
          log.date &&
          differenceInCalendarDays(new Date(log.date), new Date()) <= 7;

        const getSelectValue = (st: string) => {
          const val = String(st || '').toLowerCase().trim();
          if (val === 'accident' || val === 'off-road-accident' || (isAccidentOffRoad && (!val || val === 'accident'))) return 'accident';
          if (val === 'off-road' || val === 'off-road (vor)' || val === 'off road (vor)' || val === 'vor') return 'off-road';
          if (val === 'parts-backorder' || val === 'awaiting-parts' || val === 'parts backorder') return 'parts-backorder';
          if (val === 'pending' || val === 'awaiting-approval') return 'pending';
          if (val === 'inspection' || val === 'diagnostic') return 'inspection';
          if (val === 'workshop') return 'workshop';
          if (val === 'bodywork') return 'bodywork';
          if (val === 'in-progress') return 'in-progress';
          if (val === 'completed') return 'completed';
          if (val === 'cancelled') return 'cancelled';
          if (!val && isAccidentOffRoad) return 'accident';
          if (!val && isOffRoad) return 'off-road';
          return val || 'scheduled';
        };

        const currentSelectVal = getSelectValue(log.status);

        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
          const val = e.target.value;
          if (val === 'completed') {
            onComplete(log);
          } else {
            onStatusChange(log, val);
          }
        };

        return (
          <div className="space-y-1.5 w-36 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
            {canEditStatusFromTable ? (
              <select
                value={currentSelectVal}
                onChange={handleChange}
                className={`block w-full min-w-[136px] text-xs font-bold rounded-lg border py-1.5 pl-2.5 pr-7 cursor-pointer ring-1 ring-inset shadow-2xs sm:text-xs sm:leading-tight transition-all ${getStatusColor(
                  currentSelectVal,
                  isScheduledUrgent,
                  isAccidentOffRoad,
                  isOffRoad
                )}`}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="workshop">In Workshop</option>
                <option value="parts-backorder">Awaiting Parts</option>
                <option value="bodywork">Bodywork</option>
                <option value="off-road">OFF ROAD (VOR)</option>
                <option value="accident">Accident</option>
                <option value="pending">Pending Approval</option>
                <option value="inspection">Inspection / MOT</option>
                {can('maintenance', 'complete') && (
                  <option value="completed">Completed</option>
                )}
                {canSeeCompleted && (
                  <option value="cancelled">Cancelled</option>
                )}
              </select>
            ) : (
              <StatusBadge
                status={getMaintenanceStatusLabel(currentSelectVal, {
                  isAccident: isAccidentOffRoad,
                  isOffRoad,
                })}
              />
            )}

            {!isCompany && (
              <div className="pl-0.5">
                <StatusBadge
                  status={derivePaymentStatus({
                    cost: log.cost,
                    paidAmount: log.paidAmount,
                    remainingAmount: log.remainingAmount,
                    paymentStatus: log.paymentStatus,
                    payments: log.payments
                  })}
                />
              </div>
            )}

            {isAccidentOffRoad && (
              <div className="pl-0.5">
                <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  log.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {log.status === 'completed' ? 'Vehicle Available' : 'Vehicle Unavailable'}
                </span>
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
        const { cost, paidAmount = 0, remainingAmount = 0, subcontractorCost, customerBilled, isProfitEdited } = row.original;
        const billed = customerBilled !== undefined ? Number(customerBilled) : Number(cost || 0);

        // 1. DEFAULT PROFIT EXCLUSION (IGNORE UNTIL EDITED & SAVED):
        // For all newly created/unedited data records, default Dealer Cost to match Total price (Profit £0.00 / 0.0% Margin).
        // The system IGNORES profit calculation UNTIL a user manually opens the record, clicks "Edit", updates info, and hits "Save" / "Update".
        const hasEditedProfit = isProfitEdited === true;
        const sub = hasEditedProfit
          ? (subcontractorCost !== undefined ? Number(subcontractorCost) : billed)
          : billed;
        const profitMetrics = hasEditedProfit
          ? calculateProfitMetrics(billed, sub)
          : { customerBilled: billed, subcontractorCost: billed, netProfit: 0, profitMarginPercent: 0 };
        const hasSubcontractorCost = hasEditedProfit && sub > 0 && sub !== billed;

        return (
          <div className="space-y-0.5 text-xs w-28">
            {/* Total / Invoice: Orange / Amber (#D97706) */}
            <div className="flex justify-between font-bold text-[#D97706] border-b border-slate-200/80 pb-0.5">
              <span>Total:</span>
              <span className="font-mono">{formatCurrency(cost)}</span>
            </div>
            {/* Paid: Green (#059669) */}
            <div className="flex justify-between font-bold text-[#059669]">
              <span>Paid:</span>
              <span className="font-mono">{formatCurrency(paidAmount)}</span>
            </div>
            {/* Owing / Outstanding: Red (#DC2626) when > 0, Green (#059669) when 0 */}
            <div
              className={`flex justify-between font-bold ${
                remainingAmount > 0.001
                  ? 'text-[#DC2626]'
                  : 'text-[#059669]'
              }`}
            >
              <span>Owing:</span>
              <span className="font-mono">{formatCurrency(remainingAmount)}</span>
            </div>
            {hasSubcontractorCost && (
              <div className="pt-0.5 border-t border-dashed border-slate-200 flex justify-between text-[10px] font-medium text-slate-500">
                <span>Dealer:</span>
                <span className="font-mono font-bold text-slate-700">{formatCurrency(sub)}</span>
              </div>
            )}
            {hasSubcontractorCost && (
              <div className="flex justify-between text-[10px] font-bold items-center pt-0.5">
                <span className={profitMetrics.netProfit >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}>Profit:</span>
                <span className={`font-mono ${profitMetrics.netProfit >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                  {profitMetrics.netProfit >= 0 ? '+' : ''}{formatCurrency(profitMetrics.netProfit)}
                </span>
              </div>
            )}
            {hasSubcontractorCost && (
              <div className="flex justify-end pt-0.5">
                <span
                  className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded border ${
                    profitMetrics.profitMarginPercent >= 0
                      ? 'bg-emerald-50 text-[#059669] border-emerald-200'
                      : 'bg-rose-50 text-[#DC2626] border-rose-200'
                  }`}
                >
                  {profitMetrics.profitMarginPercent.toFixed(1)}% Margin
                </span>
              </div>
            )}
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

  const scheduledCount = useMemo(() => logs.filter(log => log.status === 'scheduled').length, [logs]);
  const inProgressCount = useMemo(() => logs.filter(log => log.status === 'in-progress').length, [logs]);
  const workshopCount = useMemo(() => logs.filter(log => log.status === 'workshop').length, [logs]);
  const partsBackorderCount = useMemo(() => logs.filter(log => log.status === 'parts-backorder' || log.status === 'awaiting-parts').length, [logs]);
  const bodyworkCount = useMemo(() => logs.filter(log => log.status === 'bodywork').length, [logs]);
  const pendingCount = useMemo(() => logs.filter(log => log.status === 'pending' || log.status === 'awaiting-approval').length, [logs]);
  const completedCount = useMemo(() => logs.filter(log => log.status === 'completed').length, [logs]);
  const cancelledCount = useMemo(() => logs.filter(log => log.status === 'cancelled').length, [logs]);

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
    const { date, status, paymentStatus, remainingAmount, cost, paidAmount } = row.original;

    // Payment status left-border indicator: red for owing, green for paid
    const dynamicPaymentStatus = derivePaymentStatus({
      cost,
      paidAmount,
      remainingAmount,
      paymentStatus,
      payments: row.original.payments
    });
    const isPaid = dynamicPaymentStatus === 'paid';
    const isAccident = isOffRoadAccidentLog(row.original) || normalizeMaintenanceStatus(status) === 'accident';
    const isOffRoad = isStatusOffRoad(status, { isAccident, isOffRoad: (row.original as any).isOffRoad });

    const theme = getMaintenanceRowTheme(status, {
      date,
      isDarkTheme: false,
      isAccident,
      isOffRoad,
      isPaid,
    });

    return theme.rowClass;
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

      {/* Color Status Legend with Interactive Dynamic Filters Combined in One Line */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 py-2.5 px-3.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl shadow-xs text-xs mb-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 border-r border-slate-300 pr-2.5 mr-0.5">
            <span className="text-[#475569] font-bold uppercase tracking-wider text-[11px] shrink-0">
              Payment:
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs" title="Red left-border indicates outstanding balance">
              <span className="w-1.5 h-3 bg-[#dc2626] rounded-xs inline-block"></span>
              <span className="text-[#dc2626]">Owing</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-2xs" title="Green left-border indicates paid in full">
              <span className="w-1.5 h-3 bg-[#059669] rounded-xs inline-block"></span>
              <span className="text-[#059669]">Paid</span>
            </span>
          </div>

          <span className="text-[#475569] font-bold uppercase tracking-wider text-[11px] shrink-0 mr-0.5">
            Jobs:
          </span>

          {/* 1. All Scheduled */}
          {onStatusFilterChange && (
            <button
              type="button"
              onClick={() => onStatusFilterChange(statusFilter === 'scheduled' ? 'all' : 'scheduled')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                statusFilter === 'scheduled'
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400 border-amber-600'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Filter by all Scheduled jobs"
            >
              <span>Scheduled</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                statusFilter === 'scheduled' ? 'bg-amber-900 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {scheduledCount}
              </span>
            </button>
          )}

          {/* 2. Due in ≤7d */}
          <button
            type="button"
            onClick={() => setActiveHighlightFilter(prev => prev === 'due7d' ? 'all' : 'due7d')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeHighlightFilter === 'due7d'
                ? 'bg-[#B91C1C] text-white shadow-xs ring-2 ring-red-400'
                : 'bg-[#FEE2E2] hover:bg-[#FECACA] border border-red-200 text-[#B91C1C]'
            }`}
            title="Click to filter: Show only jobs due in ≤7 days"
          >
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${activeHighlightFilter === 'due7d' ? 'bg-white' : 'bg-[#B91C1C]'}`}></span>
            <span>Due in ≤7d</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs ${
              activeHighlightFilter === 'due7d' ? 'bg-red-800 text-white' : 'bg-[#B91C1C] text-white'
            }`}>
              {due7dCount}
            </span>
          </button>

          {/* 3. In Progress */}
          <button
            type="button"
            onClick={() => {
              if (onStatusFilterChange) {
                onStatusFilterChange(statusFilter === 'in-progress' ? 'all' : 'in-progress');
              } else {
                setActiveHighlightFilter(prev => prev === 'in-progress' ? 'all' : 'in-progress');
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'in-progress' || activeHighlightFilter === 'in-progress'
                ? 'bg-[#B45309] text-white shadow-xs ring-2 ring-amber-400'
                : 'bg-[#FEF3C7] hover:bg-[#FDE68A] border border-amber-200 text-[#B45309]'
            }`}
            title="Click to filter: Show only jobs in progress"
          >
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${
              statusFilter === 'in-progress' || activeHighlightFilter === 'in-progress' ? 'bg-white' : 'bg-[#B45309]'
            }`}></span>
            <span>In Progress</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full shadow-xs ${
              statusFilter === 'in-progress' || activeHighlightFilter === 'in-progress' ? 'bg-amber-900 text-white' : 'bg-[#B45309] text-white'
            }`}>
              {inProgressCount}
            </span>
          </button>

          {/* 4. In Workshop */}
          {onStatusFilterChange && (
            <button
              type="button"
              onClick={() => onStatusFilterChange(statusFilter === 'workshop' ? 'all' : 'workshop')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                statusFilter === 'workshop'
                  ? 'bg-purple-600 text-white shadow-xs ring-2 ring-purple-400 border-purple-600'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
              title="Filter by vehicles In Workshop"
            >
              <span>In Workshop</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                statusFilter === 'workshop' ? 'bg-purple-900 text-white' : 'bg-purple-200 text-purple-900'
              }`}>
                {workshopCount}
              </span>
            </button>
          )}

          {/* 5. Awaiting Parts */}
          {onStatusFilterChange && (
            <button
              type="button"
              onClick={() => onStatusFilterChange(statusFilter === 'parts-backorder' ? 'all' : 'parts-backorder')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                statusFilter === 'parts-backorder'
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400 border-amber-600'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
              title="Filter by vehicles Awaiting Parts"
            >
              <span>Awaiting Parts</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                statusFilter === 'parts-backorder' ? 'bg-amber-900 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {partsBackorderCount}
              </span>
            </button>
          )}

          {/* 6. Bodywork */}
          {onStatusFilterChange && (
            <button
              type="button"
              onClick={() => onStatusFilterChange(statusFilter === 'bodywork' ? 'all' : 'bodywork')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                statusFilter === 'bodywork'
                  ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400 border-indigo-600'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
              }`}
              title="Filter by Bodywork"
            >
              <span>Bodywork</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                statusFilter === 'bodywork' ? 'bg-indigo-900 text-white' : 'bg-indigo-200 text-indigo-900'
              }`}>
                {bodyworkCount}
              </span>
            </button>
          )}

          {/* 7. Off-Road (VOR) */}
          {onRoadConditionFilterChange && (
            <button
              type="button"
              onClick={() => onRoadConditionFilterChange(roadConditionFilter === 'off-road-accident' ? 'all' : 'off-road-accident')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                roadConditionFilter === 'off-road-accident'
                  ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-400 border-rose-600'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
              title="Filter by Off-Road non-drivable vehicles (VOR)"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Off-Road (VOR)</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                roadConditionFilter === 'off-road-accident' ? 'bg-white text-rose-700' : 'bg-rose-200 text-rose-900'
              }`}>
                {offRoadAccidentCount ?? 0}
              </span>
            </button>
          )}

          {/* 8. Pending */}
          {pendingCount > 0 && onStatusFilterChange && (
            <button
              type="button"
              onClick={() => onStatusFilterChange(statusFilter === 'pending' ? 'all' : 'pending')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-yellow-600 text-white shadow-xs ring-2 ring-yellow-400 border-yellow-600'
                  : 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100'
              }`}
              title="Filter by Pending Approval"
            >
              <span>Pending</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                statusFilter === 'pending' ? 'bg-yellow-900 text-white' : 'bg-yellow-200 text-yellow-900'
              }`}>
                {pendingCount}
              </span>
            </button>
          )}

          {/* 9. Completed */}
          {canSeeCompleted && onStatusFilterChange && (
            <button
              type="button"
              onClick={() => onStatusFilterChange(statusFilter === 'completed' ? 'all' : 'completed')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400 border-emerald-600'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="Filter by Completed jobs"
            >
              <span>Completed</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                statusFilter === 'completed' ? 'bg-emerald-900 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {completedCount}
              </span>
            </button>
          )}

          {/* 10. Cancelled */}
          {canSeeCompleted && onStatusFilterChange && cancelledCount > 0 && (
            <button
              type="button"
              onClick={() => onStatusFilterChange(statusFilter === 'cancelled' ? 'all' : 'cancelled')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                statusFilter === 'cancelled'
                  ? 'bg-slate-700 text-white shadow-xs ring-2 ring-slate-400 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
              title="Filter by Cancelled jobs"
            >
              <span>Cancelled</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                statusFilter === 'cancelled' ? 'bg-slate-900 text-white' : 'bg-slate-300 text-slate-900'
              }`}>
                {cancelledCount}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {(activeHighlightFilter !== 'all' || (statusFilter && statusFilter !== 'all') || (roadConditionFilter && roadConditionFilter !== 'all')) && (
            <button
              type="button"
              onClick={() => {
                setActiveHighlightFilter('all');
                onStatusFilterChange?.('all');
                onRoadConditionFilterChange?.('all');
              }}
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
        vehicles={Object.values(vehicles)}
        customers={Object.values(activeCustomersMap)}
        rentals={activeRentals}
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