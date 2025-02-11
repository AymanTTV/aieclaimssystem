import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Vehicle } from '../../types';
import { Eye, Edit, Trash2, DollarSign } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate } from '../../utils/dateHelpers';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import { addDays } from 'date-fns';

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

  const sortedVehicles = [...vehicles].sort((a, b) => {
    const now = new Date();
    const thirtyDays = addDays(now, 30);

    // Helper function to count expiring/expired documents
    const countExpiringDocs = (vehicle: Vehicle) => {
      let count = 0;
      
      // Count expired documents (these get higher priority)
      if (vehicle.motExpiry < now) count += 10;
      if (vehicle.insuranceExpiry < now) count += 10;
      if (vehicle.nslExpiry < now) count += 10;
      if (vehicle.roadTaxExpiry < now) count += 10;

      // Count documents expiring within 30 days
      if (vehicle.motExpiry <= thirtyDays && vehicle.motExpiry >= now) count += 5;
      if (vehicle.insuranceExpiry <= thirtyDays && vehicle.insuranceExpiry >= now) count += 5;
      if (vehicle.nslExpiry <= thirtyDays && vehicle.nslExpiry >= now) count += 5;
      if (vehicle.roadTaxExpiry <= thirtyDays && vehicle.roadTaxExpiry >= now) count += 5;

      return count;
    };

    // Get expiring document count for both vehicles
    const aCount = countExpiringDocs(a);
    const bCount = countExpiringDocs(b);

    // Sort by number of expiring documents (descending)
    if (aCount !== bCount) {
      return bCount - aCount;
    }

    // If same number of expiring documents, sort by earliest expiry date
    const aEarliestExpiry = Math.min(
      a.motExpiry.getTime(),
      a.insuranceExpiry.getTime(),
      a.nslExpiry.getTime(),
      a.roadTaxExpiry.getTime()
    );

    const bEarliestExpiry = Math.min(
      b.motExpiry.getTime(),
      b.insuranceExpiry.getTime(),
      b.nslExpiry.getTime(),
      b.roadTaxExpiry.getTime()
    );

    return aEarliestExpiry - bEarliestExpiry;
  });

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
      cell: ({ row }) => {
        const vehicle = row.original;
        const statuses = vehicle.activeStatuses || [];
        
        // Map status to display text
        const getDisplayStatus = (status: string) => {
          switch (status) {
            case 'rented':
              return 'hired';
            case 'scheduled-rental':
              return 'scheduled for hire';
            default:
              return status.replace('-', ' ');
          }
        };

        return (
          <div className="space-y-1">
            {statuses.length > 0 ? (
              statuses.map((status, index) => (
                <StatusBadge 
                  key={index} 
                  status={getDisplayStatus(status)}
                />
              ))
            ) : (
              <StatusBadge status="available" />
            )}
          </div>
        );
      },
    },
    {
      header: 'Rental Rates',
      cell: ({ row }) => (
        <div className="space-y-1 text-sm">
          <div>Weekly: £{Math.round(row.original.weeklyRentalPrice)}</div>
          <div>Daily: £{Math.round(row.original.dailyRentalPrice)}</div>
          <div>Claim: £{Math.round(row.original.claimRentalPrice)}</div>
        </div>
      ),
    },
    {
      header: 'MOT Expiry',
      cell: ({ row }) => (
        <div className={isExpiringOrExpired(row.original.motExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.motExpiry)}
        </div>
      ),
    },
    {
      header: 'Insurance Expiry',
      cell: ({ row }) => (
        <div className={isExpiringOrExpired(row.original.insuranceExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.insuranceExpiry)}
        </div>
      ),
    },
    {
      header: 'NSL Expiry',
      cell: ({ row }) => (
        <div className={isExpiringOrExpired(row.original.nslExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.nslExpiry)}
        </div>
      ),
    },
    {
      header: 'Road Tax Expiry',
      cell: ({ row }) => (
        <div className={isExpiringOrExpired(row.original.roadTaxExpiry) ? 'text-red-600 font-medium' : ''}>
          {formatDate(row.original.roadTaxExpiry)}
        </div>
      ),
    },
    {
      header: 'Mileage',
      cell: ({ row }) => (
        <span>{row.original.mileage.toLocaleString()} km</span>
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
      data={sortedVehicles}
      columns={columns}
      onRowClick={(vehicle) => can('vehicles', 'view') && onView(vehicle)}
      rowClassName={(vehicle) => {
        const now = new Date();
        const thirtyDays = addDays(now, 30);
        
        // Check for expired documents
        if (
          vehicle.motExpiry < now ||
          vehicle.insuranceExpiry < now ||
          vehicle.nslExpiry < now ||
          vehicle.roadTaxExpiry < now
        ) {
          return 'bg-red-50';
        }
        
        // Check for documents expiring within 30 days
        if (
          (vehicle.motExpiry <= thirtyDays && vehicle.motExpiry >= now) ||
          (vehicle.insuranceExpiry <= thirtyDays && vehicle.insuranceExpiry >= now) ||
          (vehicle.nslExpiry <= thirtyDays && vehicle.nslExpiry >= now) ||
          (vehicle.roadTaxExpiry <= thirtyDays && vehicle.roadTaxExpiry >= now)
        ) {
          return 'bg-yellow-50';
        }
        
        return '';
      }}
    />
  );
};

export default VehicleTable;