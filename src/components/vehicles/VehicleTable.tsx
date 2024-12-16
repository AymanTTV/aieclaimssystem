import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Vehicle } from '../../types';
import { Eye, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { formatDate } from '../../utils/dateHelpers';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';

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
  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          {row.original.image ? (
            <img 
              src={row.original.image} 
              alt={`${row.original.make} ${row.original.model}`}
              className="h-10 w-10 object-cover rounded-md"
            />
          ) : (
            <div className="h-10 w-10 bg-gray-100 rounded-md flex items-center justify-center">
              <span className="text-gray-400 text-xs">No image</span>
            </div>
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
      header: 'Mileage',
      cell: ({ row }) => row.original.mileage.toLocaleString(),
    },
    {
      header: 'MOT',
      cell: ({ row }) => (
        <div className={isExpiringOrExpired(row.original.motExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.motExpiry)}
        </div>
      ),
    },
    {
      header: 'NSL',
      cell: ({ row }) => (
        <div className={isExpiringOrExpired(row.original.nslExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.nslExpiry)}
        </div>
      ),
    },
    {
      header: 'Road Tax',
      cell: ({ row }) => (
        <div className={isExpiringOrExpired(row.original.roadTaxExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.roadTaxExpiry)}
        </div>
      ),
    },
    {
      header: 'Insurance',
      cell: ({ row }) => (
        <div className={isExpiringOrExpired(row.original.insuranceExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.insuranceExpiry)}
        </div>
      ),
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
      data={vehicles}
      columns={columns}
      onRowClick={(vehicle) => onView(vehicle)}
    />
  );
};

export default VehicleTable;