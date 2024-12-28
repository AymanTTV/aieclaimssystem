import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Vehicle } from '../../types';
import { Eye, Edit, Trash2, DollarSign } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { useRentals } from '../../hooks/useRentals';
import { useMaintenanceLogs } from '../../hooks/useMaintenanceLogs';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import { format, isValid } from 'date-fns';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onMarkAsSold: (vehicle: Vehicle) => void;
}

const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles,
  onView,
  onEdit,
  onDelete,
  onMarkAsSold,
}) => {
  const { can } = usePermissions();
  const { rentals } = useRentals();
  const { logs: maintenanceLogs } = useMaintenanceLogs();

  const getVehicleStatuses = (vehicleId: string): string[] => {
    const statuses: string[] = [];

    // Check for active rentals
    const hasActiveRental = rentals.some(
      rental => 
        rental.vehicleId === vehicleId && 
        (rental.status === 'rented' || rental.status === 'active')
    );
    if (hasActiveRental) {
      statuses.push('rented');
    }

    // Check for active maintenance
    const hasActiveMaintenance = maintenanceLogs.some(
      log => 
        log.vehicleId === vehicleId && 
        (log.status === 'scheduled' || log.status === 'in-progress')
    );
    if (hasActiveMaintenance) {
      statuses.push('maintenance');
    }

    // If no active statuses, vehicle is available
    if (statuses.length === 0) {
      statuses.push('available');
    }

    return statuses;
  };

  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    const parsedDate = new Date(date);
    return isValid(parsedDate) ? format(parsedDate, 'dd/MM/yyyy') : 'Invalid Date';
  };

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
              <span className="text-gray-400 text-xs">No img</span>
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
      header: 'Owner',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.owner?.name || 'AIE Skyline'}
          </div>
          {row.original.owner?.address && !row.original.owner?.isDefault && (
            <div className="text-sm text-gray-500">{row.original.owner.address}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }: { row: any }) => {
        const statuses = getVehicleStatuses(row.original.id);
        return (
          <div className="space-y-1">
            {statuses.map((status, index) => (
              <StatusBadge key={`${status}-${index}`} status={status} />
            ))}
          </div>
        );
      },
    },
    {
      header: 'MOT',
      cell: ({ row }: { row: any }) => (
        <span className={isExpiringOrExpired(row.original.motExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.motExpiry)}
        </span>
      ),
    },
    {
      header: 'Insurance',
      cell: ({ row }: { row: any }) => (
        <span className={isExpiringOrExpired(row.original.insuranceExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.insuranceExpiry)}
        </span>
      ),
    },
    {
      header: 'Road Tax',
      cell: ({ row }: { row: any }) => (
        <span className={isExpiringOrExpired(row.original.roadTaxExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.roadTaxExpiry)}
        </span>
      ),
    },
    {
      header: 'NSL',
      cell: ({ row }: { row: any }) => (
        <span className={isExpiringOrExpired(row.original.nslExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.nslExpiry)}
        </span>
      ),
    },
    {
      header: 'Mileage',
      cell: ({ row }: { row: any }) => (
        <span>{row.original.mileage.toLocaleString()} km</span>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }: { row: any }) => (
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
          {can('vehicles', 'update') && row.original.status !== 'sold' && (
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
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsSold(row.original);
                }}
                className="text-green-600 hover:text-green-800"
                title="Mark as Sold"
              >
                <DollarSign className="h-4 w-4" />
              </button>
            </>
          )}
          {can('vehicles', 'delete') && row.original.status === 'sold' && (
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