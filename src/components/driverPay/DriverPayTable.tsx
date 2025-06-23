// src/components/driverPay/DriverPayTable.tsx

import React from 'react';
import { DataTable } from '../DataTable/DataTable'; // Ensure path is correct
import { DriverPay, PaymentPeriod } from '../../types/driverPay'; // Ensure path is correct
import { Eye, Edit, DollarSign, Trash2, FileText, CalendarPlus } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge'; // Ensure path is correct
import { usePermissions } from '../../hooks/usePermissions'; // Ensure path is correct
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers'; // Ensure path is correct
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay'; // Ensure path is correct


interface DriverPayTableProps {
  records: DriverPay[];
  onView: (record: DriverPay) => void;
  onEdit: (record: DriverPay) => void;
  onDelete: (record: DriverPay) => void;
  onRecordPayment: (record: DriverPay) => void;
  onGenerateDocument: (record: DriverPay) => void;
  onViewDocument?: (url: string) => void;
  onAddPeriod: (record: DriverPay) => void; // <-- Add this new prop
}

const DriverPayTable: React.FC<DriverPayTableProps> = ({
  records,
  onView,
  onEdit,
  onDelete,
  onRecordPayment,
  onGenerateDocument,
  onViewDocument, // Destructure the prop
  onAddPeriod
}) => {
  const { can } = usePermissions();
  const { formatCurrency } = useFormattedDisplay(); // Use the hook

  // This check remains the same - it checks if *any* period has low pay
  // for the overall driver attention flag.
  const checkDriverRed = (periods: PaymentPeriod[]): { isRed: boolean; reason: string } => {
    if (!periods || periods.length === 0) return { isRed: false, reason: "" };
    const hasLowPeriodPay = periods.some(period => (period.netPay || 0) < 500);
    return { isRed: hasLowPeriodPay, reason: hasLowPeriodPay ? "Low Period Pay" : "" };
  };

  // Helper to get the last period based on endDate
  const getLastPeriod = (periods: PaymentPeriod[] | undefined): PaymentPeriod | null => {
      if (!periods || periods.length === 0) {
          return null;
      }
      // Create a copy and sort periods by endDate descending
      const sortedPeriods = [...periods].sort((a, b) => {
          const dateA = ensureValidDate(a.endDate).getTime();
          const dateB = ensureValidDate(b.endDate).getTime();
          return dateB - dateA; // Most recent end date first
      });
      return sortedPeriods[0]; // Return the first element (most recent)
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
      header: 'Last Payment Period', // Updated Header
      cell: ({ row }) => {
        const allPeriods = row.original.paymentPeriods || [];
        const lastPeriod = getLastPeriod(allPeriods); // Get the most recent period
        const { isRed: isDriverRed, reason } = checkDriverRed(allPeriods); // Check all periods for the flag

        return (
          <div className="space-y-2">
            {lastPeriod ? (
              // Display only the last period's details
              <div key={lastPeriod.id} className={`text-sm ${lastPeriod.netPay < 500 ? 'text-red-500' : ''}`}>
                {/* Removed "Period X:" label as we only show one */}
                <div>
                  {format(ensureValidDate(lastPeriod.startDate), 'dd/MM/yyyy')} -{' '}
                  {format(ensureValidDate(lastPeriod.endDate), 'dd/MM/yyyy')}
                </div>
                <div className="text-green-600 font-medium"> {/* Added font-medium */}
                  Net Pay: {formatCurrency(lastPeriod.netPay || 0)}
                </div>
                <StatusBadge status={lastPeriod.status} />
              </div>
            ) : (
              // Message if no periods exist
              <div className="text-sm text-gray-500">No payment periods</div>
            )}
            {/* Driver attention flag based on check of ALL periods */}
            {isDriverRed && (
              <div className="text-red-700 font-bold mt-2 text-xs"> {/* Made text smaller */}
                  Driver Needs Attention ({reason})
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Last Period Status', // Updated Header
      cell: ({ row }) => {
        const lastPeriod = getLastPeriod(row.original.paymentPeriods); // Get the most recent period

        return (
          <div className="space-y-1"> {/* Reduced spacing */}
            {lastPeriod ? (
              // Display payment status for the last period
              <div key={lastPeriod.id} className="text-sm">
                <div className="flex justify-between">
                  <span>Paid:</span>
                  <span className="text-green-600 font-medium"> {/* Added font-medium */}
                    {formatCurrency(lastPeriod.paidAmount || 0)}
                  </span>
                </div>
                {/* Show Due amount only if it's greater than 0 */}
                {(lastPeriod.remainingAmount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Due:</span>
                    <span className="text-amber-600 font-medium"> {/* Added font-medium */}
                      {formatCurrency(lastPeriod.remainingAmount || 0)}
                    </span>
                  </div>
                )}
                {/* Indicate if fully paid and remaining is 0 or less */}
                {(lastPeriod.remainingAmount || 0) <= 0 && lastPeriod.status === 'paid' && (
                     <div className="text-xs text-gray-500 text-right">Fully Paid</div>
                )}
              </div>
            ) : (
              // Message if no periods exist
              <div className="text-sm text-gray-500">No payment information</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-1.5"> {/* Reduced spacing */}
          {/* View Details Action */}
          {can('driverPay', 'view') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView(row.original);
              }}
              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100" // Added padding/hover bg
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
           {/* Edit Action */}
          {can('driverPay', 'update') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                className="text-indigo-600 hover:text-indigo-800 p-1 rounded hover:bg-indigo-100" // Changed color, added padding/hover bg
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
          )}
           {/* Record Payment Action - Conditionally shown */}
          {can('driverPay', 'recordPayment') && (row.original.paymentPeriods || []).some(period => (period.remainingAmount || 0) > 0) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRecordPayment(row.original);
                }}
                className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-100" // Added padding/hover bg
                title="Record Payment"
              >
                <DollarSign className="h-4 w-4" />
              </button>
          )}
           {/* Generate Document Action */}
           {can('driverPay', 'update') && ( // Assuming update permission allows generation
             <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateDocument(row.original);
                }}
                className="text-teal-600 hover:text-teal-800 p-1 rounded hover:bg-teal-100" // Changed color, added padding/hover bg
                title="Generate Document"
              >
                <FileText className="h-4 w-4" />
              </button>
           )}

           {can('driverPay', 'create') && ( // Assuming 'create' permission for adding periods
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddPeriod(row.original); // Call the new handler
          }}
          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100" // New styling
          title="Add Payment Period"
        >
          <CalendarPlus className="h-4 w-4" />
        </button>
      )}
           {/* View Document Action - Conditionally shown */}
           {/* Ensure onViewDocument prop is passed and handled */}
           {onViewDocument && row.original.documentUrl && (
             <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Assert onViewDocument is not undefined before calling
                  onViewDocument!(row.original.documentUrl!);
                }}
                className="text-sky-600 hover:text-sky-800 p-1 rounded hover:bg-sky-100" // Changed color, added padding/hover bg
                title="View Generated Document"
              >
                {/* Using Eye icon again, or choose another like ExternalLink */}
                <Eye className="h-4 w-4" />
              </button>
           )}
           {/* Delete Action */}
          {can('driverPay', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original);
              }}
              className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100" // Added padding/hover bg
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={records} // Pass the already sorted (by driverNo) records from the parent
      onRowClick={(record) => can('driverPay', 'view') && onView(record)} // Keep row click for view details
    />
  );
};

export default DriverPayTable;