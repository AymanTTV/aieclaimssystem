import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { MaintenanceLog, Vehicle } from '../../types';
import { Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate } from '../../utils/dateHelpers';
import { isAfter, isBefore, addDays } from 'date-fns';
import { calculateOverdueCost } from '../../utils/rentalCalculations';
import Modal from '../ui/Modal';

interface MaintenanceTableProps {
  logs: MaintenanceLog[];
  vehicles: Record<string, Vehicle>;
  onView: (log: MaintenanceLog) => void;
  onEdit: (log: MaintenanceLog) => void;
  onDelete: (log: MaintenanceLog) => void;
}

const MaintenanceTable: React.FC<MaintenanceTableProps> = ({
  logs,
  vehicles,
  onView,
  onEdit,
  onDelete,
}) => {
  const { can } = usePermissions();
  const [deletingLog, setDeletingLog] = React.useState<MaintenanceLog | null>(null);

  // Handle delete confirmation
  const handleDeleteClick = (log: MaintenanceLog, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingLog(log);
  };

  const handleConfirmDelete = () => {
    if (deletingLog) {
      onDelete(deletingLog);
      setDeletingLog(null);
    }
  };

  // Sort logs by maintenance date
  const sortedLogs = [...logs].sort((a, b) => {
    const now = new Date();
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    // Helper function to determine if a date is in the future
    const isFuture = (date: Date) => isAfter(date, now);

    // If both dates are in the future, closest date first
    if (isFuture(dateA) && isFuture(dateB)) {
      return dateA.getTime() - dateB.getTime();
    }

    // If only one date is in the future, it should come first
    if (isFuture(dateA)) return -1;
    if (isFuture(dateB)) return 1;

    // If both dates are in the past, most recent first
    return dateB.getTime() - dateA.getTime();
  });

  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        const vehicle = vehicles[row.original.vehicleId];
        return vehicle ? (
          <div>
            <div className="font-medium">{vehicle.make} {vehicle.model}</div>
            <div className="text-sm text-gray-500">{vehicle.registrationNumber}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Type',
      cell: ({ row }) => (
        <div>
          <span className="capitalize">{row.original.type.replace('-', ' ')}</span>
          {row.original.type === 'mot' || row.original.type === 'tfl' ? (
            <span className="ml-1 text-sm text-gray-500">Test</span>
          ) : null}
        </div>
      ),
    },
    {
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-900 truncate">{row.original.description}</p>
          {row.original.notes && (
            <p className="text-xs text-gray-500 truncate">{row.original.notes}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Date',
      cell: ({ row }) => {
        const log = row.original;
        const now = new Date();
        const maintenanceDate = new Date(log.date);
        const isFutureDate = isAfter(maintenanceDate, now);
        
        return (
          <div>
            <div className={`text-sm ${isFutureDate ? 'text-blue-600 font-medium' : ''}`}>
              {formatDate(log.date)}
            </div>
            <div className="text-sm text-gray-500">
              Next: {formatDate(log.nextServiceDate)}
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
        const log = row.original;
        return (
          <div>
            <div className="font-medium">£{log.cost.toFixed(2)}</div>
            <div className="text-xs space-y-0.5">
              <div className="text-gray-600">
                NET: £{(log.cost / 1.2).toFixed(2)}
              </div>
              <div className="text-gray-600">
                VAT: £{(log.cost * 0.2).toFixed(2)}
              </div>
            </div>
            <div className="text-xs space-y-0.5 mt-1">
              <div className="text-green-600">
                Paid: £{log.paidAmount?.toFixed(2)}
              </div>
              {log.remainingAmount > 0 && (
                <div className="text-amber-600">
                  Due: £{log.remainingAmount.toFixed(2)}
                </div>
              )}
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
          {can('maintenance', 'update') && (
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
          )}
          {can('maintenance', 'delete') && (
            <button
              onClick={(e) => handleDeleteClick(row.original, e)}
              className="text-red-600 hover:text-red-800"
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
    <>
      <DataTable
        data={logs}
        columns={columns}
        onRowClick={(log) => can('maintenance', 'view') && onView(log)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingLog}
        onClose={() => setDeletingLog(null)}
        title="Delete Maintenance Record"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this maintenance record? This action cannot be undone.
          </p>
          {deletingLog && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium">Maintenance Details:</p>
              <p className="text-sm text-gray-600">Date: {formatDate(deletingLog.date)}</p>
              <p className="text-sm text-gray-600">Type: {deletingLog.type}</p>
              <p className="text-sm text-gray-600">Cost: £{deletingLog.cost.toFixed(2)}</p>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingLog(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default MaintenanceTable;