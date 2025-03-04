import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { DriverPay } from '../../types/driverPay';
import { Eye, Edit, DollarSign, Trash2, FileText } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface DriverPayTableProps {
  records: DriverPay[];
  onView: (record: DriverPay) => void;
  onEdit: (record: DriverPay) => void;
  onDelete: (record: DriverPay) => void;
  onRecordPayment: (record: DriverPay) => void;
  onGenerateDocument: (record: DriverPay) => void;
  onViewDocument: (url: string) => void;
}

const DriverPayTable: React.FC<DriverPayTableProps> = ({
  records,
  onView,
  onEdit,
  onDelete,
  onRecordPayment,
  onGenerateDocument,
  onViewDocument
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay(); // Use the hook
  const checkDriverRed = (periods: PaymentPeriod[]): { isRed: boolean; reason: string } => {
    if (periods.length === 0) return { isRed: false, reason: "" };
    const hasLowPeriodPay = periods.some(period => period.netPay < 500);
    return { isRed: hasLowPeriodPay, reason: hasLowPeriodPay ? "Low Period Pay" : "" };
  };

  const columns = [
    {
      header: 'Driver Info',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-gray-500">
            Driver No: {row.original.driverNo}
          </div>
          <div className="text-sm text-gray-500">
            TID: {row.original.tidNo}
          </div>
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: ({ row }) => (
        <div>
          <div>{row.original.phoneNumber}</div>
          <div className="text-sm text-gray-500">
            {row.original.collection === 'OTHER' 
              ? row.original.customCollection 
              : row.original.collection}
          </div>
        </div>
      ),
    },
    {
      header: 'Payment Periods',
      cell: ({ row }) => {
        const periods = row.original.paymentPeriods || [];
        const { isRed: isDriverRed, reason } = checkDriverRed(periods);
  
        return (
          <div className="space-y-2">
            {periods.map((period, index) => (
              <div key={period.id || index} className={`text-sm ${period.netPay < 500 ? 'text-red-500' : ''}`}>
                <div className="font-medium">Period {index + 1}:</div>
                <div>
                  {format(ensureValidDate(period.startDate), 'dd/MM/yyyy')} - 
                  {format(ensureValidDate(period.endDate), 'dd/MM/yyyy')}
                </div>
                <div className="text-green-600">
                  Net Pay: {formatCurrency(period.netPay || 0)}
                </div>
                <StatusBadge status={period.status} />
              </div>
            ))}
            {periods.length === 0 && (
              <div className="text-sm text-gray-500">No payment periods</div>
            )}
            {isDriverRed && (
              <div className="text-red-700 font-bold mt-2">Driver Needs Attention ({reason})</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Payment Status',
      cell: ({ row }) => {
        const periods = row.original.paymentPeriods || [];
        return (
          <div className="space-y-2">
            {periods.map((period, index) => (
              <div key={period.id || index} className="text-sm">
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span className="text-green-600">
                    {formatCurrency(period.paidAmount || 0)}
                  </span>
                </div>
                {period.remainingAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Due:</span>
                    <span className="text-amber-600">
                      {formatCurrency(period.remainingAmount || 0)}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {periods.length === 0 && (
              <div className="text-sm text-gray-500">No payment information</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('driverPay', 'view') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(row.original);
              }}
              className="text-blue-600 hover:text-blue-800"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          {can('driverPay', 'update') && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                className="text-blue-600 hover:text-blue-800"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              {(row.original.paymentPeriods || []).some(period => period.remainingAmount > 0) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRecordPayment(row.original);
                  }}
                  className="text-green-600 hover:text-green-800"
                  title="Record Payment"
                >
                  <DollarSign className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateDocument(row.original);
                }}
                className="text-green-600 hover:text-green-800"
                title="Generate Document"
              >
                <FileText className="h-4 w-4" />
              </button>
            </>
          )}
          {can('driverPay', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {row.original.documentUrl && (
            <button
              onClick={(e) => {
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

  return (
    <DataTable
      data={records}
      columns={columns}
      onRowClick={(record) => can('driverPay', 'view') && onView(record)}
    />
  );
};

export default DriverPayTable;