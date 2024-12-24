import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { MaintenanceLog, Vehicle } from '../../types';
import { Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
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
  const { can } = usePermissions();

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
      header: 'Cost',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">£{row.original.cost.toFixed(2)}</div>
          <div className="text-xs text-gray-500">
            {row.original.vatDetails && 'Inc. VAT'}
          </div>
        </div>
      ),
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
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={logs}
      columns={columns}
      onRowClick={(log) => can('maintenance', 'view') && onView(log)}
    />
  );
};

export default MaintenanceTable;