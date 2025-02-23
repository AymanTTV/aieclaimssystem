import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Vehicle } from '../../types';
import { Eye, Edit, Trash2, DollarSign, RotateCw, FileText } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate } from '../../utils/dateHelpers';
import { isExpiringOrExpired } from '../../utils/vehicleUtils';
import { addDays } from 'date-fns';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
// In each table component
import { generateAndUploadDocument } from '../../utils/documentGenerator';
import { VehicleDocument } from '../pdf/documents';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onMarkAsSold: (vehicle: Vehicle) => void;
  onUndoSale: (vehicle: Vehicle) => void;
   onGenerateDocument: (vehicle: Vehicle) => Promise<void>;
  onViewDocument: (url: string) => void;
}

const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles,
  onView,
  onEdit,
  onDelete,
  onMarkAsSold,
  onUndoSale,
  onGenerateDocument,
  onViewDocument
}) => {
  const { can } = usePermissions();

  const calculateMotExpiry = (motDate: string | undefined): string | undefined => {
    if (!motDate) return undefined;
    const motExpiryDate = new Date(motDate);
    motExpiryDate.setMonth(motExpiryDate.getMonth() + 6);
    return motExpiryDate.toISOString();
  };


  const sortedVehicles = [...vehicles].sort((a, b) => {
    const now = new Date();
    const thirtyDays = addDays(now, 30);

    const countExpiringDocs = (vehicle: Vehicle) => {
      let count = 0;

      if (vehicle.motExpiry < now) count += 10;
      if (vehicle.insuranceExpiry < now) count += 10;
      if (vehicle.nslExpiry < now) count += 10;
      if (vehicle.roadTaxExpiry < now) count += 10;

      if (vehicle.motExpiry <= thirtyDays && vehicle.motExpiry >= now) count += 5;
      if (vehicle.insuranceExpiry <= thirtyDays && vehicle.insuranceExpiry >= now) count += 5;
      if (vehicle.nslExpiry <= thirtyDays && vehicle.nslExpiry >= now) count += 5;
      if (vehicle.roadTaxExpiry <= thirtyDays && vehicle.roadTaxExpiry >= now) count += 5;

      return count;
    };

    const aCount = countExpiringDocs(a);
    const bCount = countExpiringDocs(b);

    if (aCount !== bCount) {
      return bCount - aCount;
    }

    const aEarliestExpiry = Math.min(
      new Date(a.motExpiry).getTime(), // Ensure they are dates
      new Date(a.insuranceExpiry).getTime(),
      new Date(a.nslExpiry).getTime(),
      new Date(a.roadTaxExpiry).getTime()
    );

    const bEarliestExpiry = Math.min(
      new Date(b.motExpiry).getTime(), // Ensure they are dates
      new Date(b.insuranceExpiry).getTime(),
      new Date(b.nslExpiry).getTime(),
      new Date(b.roadTaxExpiry).getTime()
    );

    return aEarliestExpiry - bEarliestExpiry;
  });
  const handleGenerateDocument = async (record: Vehicle) => {
  try {
    const documentUrl = await generateAndUploadDocument(
      VehicleDocument,
      record,
      'vehicles',
      record.id,
      'vehicles'
    );
    
    toast.success('Document generated successfully');
    return documentUrl;
  } catch (error) {
    console.error('Error generating document:', error);
    toast.error('Failed to generate document');
  }
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
          {/* {row.original.owner?.address && !row.original.owner?.isDefault && (
            <div className="text-sm text-gray-500">{row.original.owner.address}</div>
          )} */}
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
          <div className="flex flex-col space-y-1"> {/* Changed from space-x-1 to space-y-1 */}
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
      header: 'Vehicle Documents',
      cell: ({ row }) => {
        const vehicle = row.original;
        const motExpiry = calculateMotExpiry(vehicle.motExpiry);

        return (
          <div className="space-y-2">
            <div className={vehicle.motExpiry}>
              MOT Test Date: {formatDate(vehicle.motExpiry)}
            </div>
            <div className={isExpiringOrExpired(motExpiry) ? 'text-red-600 font-medium' : ''}>
              MOT Expiry: {formatDate(motExpiry)}
            </div>
            <div className={isExpiringOrExpired(vehicle.insuranceExpiry) ? 'text-red-600 font-medium' : ''}>
              Insurance: {formatDate(vehicle.insuranceExpiry)}
            </div>
            <div className={isExpiringOrExpired(vehicle.nslExpiry) ? 'text-red-600 font-medium' : ''}>
              NSL: {formatDate(vehicle.nslExpiry)}
            </div>
            <div className={isExpiringOrExpired(vehicle.roadTaxExpiry) ? 'text-red-600 font-medium' : ''}>
              Road Tax: {formatDate(vehicle.roadTaxExpiry)}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Mileage',
      cell: ({ row }) => (
        <span>{row.original.mileage.toLocaleString()} Mi</span>
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
          {can('vehicles', 'update') && row.original.status === 'sold' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUndoSale(row.original);
              }}
              className="text-orange-600 hover:text-orange-800"
              title="Undo Sale"
            >
              <RotateCw className="h-4 w-4" />
            </button>
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
          {/* Document actions */}
          {can('vehicles', 'update') && (
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
          )}
          
          {row.original.documentUrl && can('vehicles', 'view') && (
            
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
      data={sortedVehicles}
      columns={columns}
      onRowClick={(vehicle) => can('vehicles', 'view') && onView(vehicle)}
      rowClassName={(row) => {
        const vehicle = row.original;
        const now = new Date();
        const thirtyDays = addDays(now, 30);

        if (
          vehicle.motExpiry < now ||
          vehicle.insuranceExpiry < now ||
          vehicle.nslExpiry < now ||
          vehicle.roadTaxExpiry < now
        ) {
          return 'bg-red-50';
        }

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