import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { MaintenanceLog, Vehicle } from '../../types';
import { Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatDate } from '../../utils/dateHelpers';

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
      header: 'Date',
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
      header: 'Mileage',
      cell: ({ row }) => (
        <div>
          <div>{row.original.currentMileage?.toLocaleString() || 'N/A'}</div>
          {row.original.nextServiceMileage && (
            <div className="text-sm text-gray-500">
              Next: {row.original.nextServiceMileage.toLocaleString()}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Cost',
      cell: ({ row }) => {
        const log = row.original;
        const partsTotal = (log.parts || []).reduce((sum, part) => sum + (part.cost * part.quantity), 0);
        const laborTotal = log.laborCost || 0;

        return (
          <div>
            <div className="font-medium">£{log.cost.toFixed(2)}</div>
            <div className="text-xs space-y-1">
              {partsTotal > 0 && (
                <div className="text-gray-500">
                  Parts: £{partsTotal.toFixed(2)}
                </div>
              )}
              {laborTotal > 0 && (
                <div className="text-gray-500">
                  Labor: £{laborTotal.toFixed(2)}
                </div>
              )}
              {log.vatDetails && (
                <div className="text-gray-500">Inc. VAT</div>
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
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={logs}
      columns={columns}
      onRowClick={(log) => onView(log)}
    />
  );
};

export default MaintenanceTable;