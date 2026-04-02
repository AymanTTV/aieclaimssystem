import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { DriverPay, PaymentPeriod } from '../../types/driverPay';
import { Eye, Edit, DollarSign, Trash2, FileText, CalendarPlus, Lock, Unlock } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

// ---- tweakable thresholds / rule switches ----
const MIN_NETPAY_ATTENTION = 500;
const ATTENTION_BY_REMAINING = false;

interface DriverPayTableProps {
  records: DriverPay[];
  onView: (record: DriverPay) => void;
  onEdit: (record: DriverPay) => void;
  onDelete: (record: DriverPay) => void;
  onRecordPayment: (record: DriverPay) => void;
  onGenerateDocument: (record: DriverPay) => void;
  onViewDocument?: (url: string) => void;
  onAddPeriod: (record: DriverPay) => void;
  onLockDriver: (record: DriverPay) => void;
  onActivateDriver: (record: DriverPay) => void;
}

const DriverPayTable: React.FC<DriverPayTableProps> = ({
  records,
  onView,
  onEdit,
  onDelete,
  onRecordPayment,
  onGenerateDocument,
  onViewDocument,
  onAddPeriod,
  onLockDriver,
  onActivateDriver,
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay();

  const getLastPeriod = (periods: PaymentPeriod[] | undefined): PaymentPeriod | null => {
    if (!periods || periods.length === 0) return null;
    const sorted = [...periods].sort(
      (a, b) => ensureValidDate(b.endDate).getTime() - ensureValidDate(a.endDate).getTime()
    );
    return sorted[0];
  };

  const needsAttention = (periods: PaymentPeriod[] | undefined): { isRed: boolean; reason: string } => {
    const last = getLastPeriod(periods);
    if (!last) return { isRed: false, reason: '' };

    if (ATTENTION_BY_REMAINING) {
      const rem = Number(last.remainingAmount ?? 0);
      if (rem < MIN_NETPAY_ATTENTION) return { isRed: true, reason: 'Low Remaining Pay (Latest Period)' };
      return { isRed: false, reason: '' };
    }

    const net = Number(last.netPay ?? 0);
    if (net < MIN_NETPAY_ATTENTION) return { isRed: true, reason: 'Low Period Pay (Latest Period)' };
    return { isRed: false, reason: '' };
  };

  const columns = [
    {
      header: 'Driver Info',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-gray-500">Driver No: {row.original.driverNo}</div>
          <div className="text-sm text-gray-500">TID: {row.original.tidNo}</div>
          {row.original.isLocked && <div className="text-xs font-bold text-red-600">LOCKED</div>}
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: ({ row }: any) => (
        <div>
          <div>{row.original.phoneNumber}</div>
          <div className="text-sm text-gray-500">
            {row.original.collection === 'OTHER' ? row.original.customCollection : row.original.collection}
          </div>
        </div>
      ),
    },
    {
      header: 'Last Payment Period',
      cell: ({ row }: any) => {
        const allPeriods = row.original.paymentPeriods || [];
        const last = getLastPeriod(allPeriods);
        const attn = needsAttention(allPeriods);

        return (
          <div className="space-y-2">
            {last ? (
              <div
                key={last.id}
                className={`text-sm ${Number(last.netPay ?? 0) < MIN_NETPAY_ATTENTION ? 'text-red-500' : ''}`}
              >
                <div>
                  {format(ensureValidDate(last.startDate), 'dd/MM/yyyy')} – {format(
                    ensureValidDate(last.endDate),
                    'dd/MM/yyyy'
                  )}
                </div>
                <div className="text-green-600 font-medium">Net Pay: {formatCurrency(last.netPay || 0)}</div>
                <StatusBadge status={last.status} />
              </div>
            ) : (
              <div className="text-sm text-gray-500">No payment periods</div>
            )}

            {attn.isRed && (
              <div className="text-red-700 font-bold mt-2 text-xs">Driver Needs Attention ({attn.reason})</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Last Period Status',
      cell: ({ row }: any) => {
        const last = getLastPeriod(row.original.paymentPeriods);
        return (
          <div className="space-y-1">
            {last ? (
              <div key={last.id} className="text-sm">
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span className="text-green-600 font-medium">{formatCurrency(last.paidAmount || 0)}</span>
                </div>
                {(last.remainingAmount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Due:</span>
                    <span className="text-amber-600 font-medium">{formatCurrency(last.remainingAmount || 0)}</span>
                  </div>
                )}
                {(last.remainingAmount || 0) <= 0 && last.status === 'paid' && (
                  <div className="text-xs text-gray-500 text-right">Fully Paid</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No payment information</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => {
        const record = row.original;
        return (
          <div className="flex space-x-1.5">
            {/* --- 🟢 CONDITIONAL ACTIONS BASED ON isLocked STATUS 🟢 --- */}
            {record.isLocked ? (
              <>
                {can('driverPay', 'view') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(record);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}
                {can('driverPay', 'unlock') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onActivateDriver(record);
                    }}
                    className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-100"
                    title="Activate Driver"
                  >
                    <Unlock className="h-4 w-4" />
                  </button>
                )}
              </>
            ) : (
              <>
                {can('driverPay', 'view') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(record);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}

                {can('driverPay', 'update') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(record);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-100"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}

                {can('driverPay', 'recordPayment') &&
                  (record.paymentPeriods || []).some((p: PaymentPeriod) => (p.remainingAmount || 0) > 0) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRecordPayment(record);
                      }}
                      className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-100"
                      title="Record Payment"
                    >
                      <DollarSign className="h-4 w-4" />
                    </button>
                  )}

                {can('driverPay', 'singleDoc') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateDocument(record);
                    }}
                    className="text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-100"
                    title="Generate Document"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                )}

                {can('driverPay', 'period') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddPeriod(record);
                    }}
                    className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100"
                    title="Add Payment Period"
                  >
                    <CalendarPlus className="h-4 w-4" />
                  </button>
                )}

                {can('driverPay', 'lock') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLockDriver(record);
                    }}
                    className="text-orange-600 hover:text-orange-800 p-1 rounded hover:bg-orange-100"
                    title="Lock Driver"
                  >
                    <Lock className="h-4 w-4" />
                  </button>
                )}
                {can('driverPay', 'singleDoc') && onViewDocument && record.documentUrl && (
                
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDocument!(record.documentUrl!);
                    }}
                    className="text-sky-600 hover:text-sky-800 p-1 rounded hover:bg-sky-100"
                    title="View Generated Document"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                )}

                {can('driverPay', 'delete') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(record);
                    }}
                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </>
            )}
          </div>
        );
      },
    },
  ];

  return <DataTable data={records} columns={columns} />;
};

export default DriverPayTable;
