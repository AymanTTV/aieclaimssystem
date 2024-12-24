import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Vehicle } from '../../types';
import { Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import { format } from 'date-fns';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles,
  onView,
  onEdit,
  onDelete,
}) => {
  const { can } = usePermissions();

  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          {row.original.image && (
            <img 
              src={row.original.image} 
              alt={`${row.original.make} ${row.original.model}`}
              className="h-10 w-10 object-cover rounded-md"
            />
          )}
          <div>
            <div className="font-medium">{row.original.make} {row.original.model}</div>
            <div className="text-sm text-gray-500">{row.original.registrationNumber}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      header: 'MOT',
      cell: ({ row }) => (
        <span className={isExpiringOrExpired(row.original.motExpiry) ? 'text-red-600 font-medium' : ''}>
          {format(row.original.motExpiry, 'dd/MM/yyyy')}
        </span>
      ),
    },
    {
      header: 'Insurance',
      cell: ({ row }) => (
        <span className={isExpiringOrExpired(row.original.insuranceExpiry) ? 'text-red-600 font-medium' : ''}>
          {format(row.original.insuranceExpiry, 'dd/MM/yyyy')}
        </span>
      ),
    },
    {
      header: 'Road Tax',
      cell: ({ row }) => (
        <span className={isExpiringOrExpired(row.original.roadTaxExpiry) ? 'text-red-600 font-medium' : ''}>
          {format(row.original.roadTaxExpiry, 'dd/MM/yyyy')}
        </span>
      ),
    },
    {
      header: 'NSL',
      cell: ({ row }) => (
        <span className={isExpiringOrExpired(row.original.nslExpiry) ? 'text-red-600 font-medium' : ''}>
          {format(row.original.nslExpiry, 'dd/MM/yyyy')}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          {can('vehicles', 'view') && (
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
          {can('vehicles', 'update') && (
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
          {can('vehicles', 'delete') && (
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
      data={vehicles}
      columns={columns}
      onRowClick={(vehicle) => can('vehicles', 'view') && onView(vehicle)}
    />
  );
};

export default VehicleTable;