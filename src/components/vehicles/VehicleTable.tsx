// src/components/vehicles/VehicleTable.tsx
import React from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Vehicle } from '../../types';
import { Eye, Edit, Trash2, DollarSign, RotateCw, FileText, Wrench, AlertTriangle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate } from '../../utils/dateHelpers';
import { isExpiringOrExpired, isServiceOverdue, isServiceDueSoon } from '../../utils/vehicleUtils';
import { addDays } from 'date-fns';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  onMarkAsSold: (vehicle: Vehicle) => void;
  onUndoSale: (vehicle: Vehicle) => void;
  onGenerateDocument: (vehicle: Vehicle) => Promise<void>;
  onViewDocument: (url: string) => void;
  onSetServiceMileage: (vehicle: Vehicle) => void;
}

const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles,
  onView,
  onEdit,
  onDelete,
  onMarkAsSold,
  onUndoSale,
  onGenerateDocument,
  onSetServiceMileage,
  onViewDocument
}) => {
  const { can } = usePermissions();

  const sortedVehicles = [...vehicles].sort((a, b) => {
    const now = new Date();
    const thirtyDays = addDays(now, 30);

    const countExpiringDocs = (vehicle: Vehicle) => {
      let count = 0;

      if (vehicle.motExpiry && new Date(vehicle.motExpiry) < now) count += 10;
      if (vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) < now) count += 10;
      if (vehicle.nslExpiry && new Date(vehicle.nslExpiry) < now) count += 10;
      if (vehicle.roadTaxExpiry && new Date(vehicle.roadTaxExpiry) < now) count += 10;

      const aMileage = typeof vehicle.mileage === 'number' ? vehicle.mileage : 0;
      const aNextServiceMileage =
        typeof vehicle.nextServiceMileage === 'number' ? vehicle.nextServiceMileage : aMileage + 25000;

      if (aMileage >= aNextServiceMileage) count += 15;
      if (aMileage < aNextServiceMileage && aNextServiceMileage - aMileage <= 1000) count += 7;

      // Check expiring soon
      const checkSoon = (d: Date | null | undefined) => {
         if (!d) return false;
         const dt = new Date(d);
         return dt <= thirtyDays && dt >= now;
      };

      if (checkSoon(vehicle.motExpiry)) count += 5;
      if (checkSoon(vehicle.insuranceExpiry)) count += 5;
      if (checkSoon(vehicle.nslExpiry)) count += 5;
      if (checkSoon(vehicle.roadTaxExpiry)) count += 5;

      return count;
    };

    const aCount = countExpiringDocs(a);
    const bCount = countExpiringDocs(b);

    if (aCount !== bCount) {
      return bCount - aCount;
    }

    return (a.make || '').localeCompare(b.make || '');
  });

  const money3 = (n: unknown) =>
    typeof n === 'number'
      ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })
      : '-';

  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }: any) => (
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
            {/* UPDATED: Show Assigned Account Name */}
            <div className={`text-xs font-semibold mb-0.5 ${row.original.owner?.accountName ? 'text-blue-600' : 'text-gray-400 italic'}`}>
                {row.original.owner?.accountName || 'No Account Assigned'}
            </div>
            <div className="font-medium">
              {row.original.make} {row.original.model}
            </div>
            <div className="text-sm text-gray-500">{row.original.registrationNumber}</div>
          </div>
        </div>
      ),
    },

    // Owner column (kept for explicit ownership details if permission allows)
    can('vehicles', 'owner') && {
      header: 'Owner',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.owner?.name || 'AIE Skyline'}</div>
        </div>
      ),
    },

    {
      header: 'Status',
      cell: ({ row }: any) => {
        const vehicle = row.original;
        const statuses = vehicle.activeStatuses || [];

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

        if (vehicle.status === 'sold') {
          return (
            <div className="flex flex-col space-y-1">
              <StatusBadge status="sold" />
            </div>
          );
        }

        if (statuses.length > 0) {
          return (
            <div className="flex flex-col space-y-1">
              {statuses.map((s: string, i: number) => (
                <StatusBadge key={i} status={getDisplayStatus(s)} />
              ))}
            </div>
          );
        }

        return (
          <div className="flex flex-col space-y-1">
            <StatusBadge status={getDisplayStatus(vehicle.status || 'available')} />
          </div>
        );
      },
    },

    {
      header: 'Rental Rates',
      cell: ({ row }: any) => {
        const v = row.original;
        return (
          <div className="space-y-1 text-sm">
            <div>
              Weekly: £{money3(v.weeklyRentalPrice)}
              {typeof v.weeklyInsuranceAmount === 'number' && (
                <> <span className="text-gray-500">(Ins: £{money3(v.weeklyInsuranceAmount)})</span></>
              )}
            </div>
            <div>
              Daily: £{money3(v.dailyRentalPrice)}
              {typeof v.dailyInsuranceAmount === 'number' && (
                <> <span className="text-gray-500">(Ins: £{money3(v.dailyInsuranceAmount)})</span></>
              )}
            </div>
            <div>
              Claim: £{money3(v.claimRentalPrice)}
              {typeof v.claimInsuranceAmount === 'number' && (
                <> <span className="text-gray-500">(Ins: £{money3(v.claimInsuranceAmount)})</span></>
              )}
            </div>
          </div>
        );
      },
    },

    {
      header: 'Vehicle Documents',
      cell: ({ row }: any) => {
        const vehicle = row.original;
        const motExpiryDate = vehicle.motExpiry instanceof Date ? vehicle.motExpiry : vehicle.motExpiry?.toDate();

        return (
          <div className="space-y-2">
            <div className={isExpiringOrExpired(vehicle.motTestDate) ? 'text-red-600 font-medium' : ''}>
              MOT Test Date: {formatDate(vehicle.motTestDate)}
            </div>
            <div className={isExpiringOrExpired(motExpiryDate) ? 'text-red-600 font-medium' : ''}>
              MOT Expiry: {formatDate(motExpiryDate)}
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
      header: 'Mileage & Maintenance',
      cell: ({ row }: any) => {
        const vehicle = row.original;
        const currentMileage = typeof vehicle.mileage === 'number' ? vehicle.mileage : 0;
        const nextServiceMileageStored =
          typeof vehicle.nextServiceMileage === 'number' ? vehicle.nextServiceMileage : currentMileage + 25000;
        const milesToNext = nextServiceMileageStored - currentMileage;

        return (
          <div className="space-y-1">
            <div className={isServiceOverdue(vehicle) ? 'text-red-600 font-medium' : ''}>
              Current: {currentMileage.toLocaleString()} Mi
            </div>
            <div
              className={
                isServiceOverdue(vehicle)
                  ? 'text-red-600 font-medium flex items-center'
                  : isServiceDueSoon(vehicle)
                  ? 'text-yellow-600 font-medium flex items-center'
                  : 'flex items-center'
              }
            >
              Next Service: {nextServiceMileageStored.toLocaleString()} Mi
              {isServiceOverdue(vehicle) && <AlertTriangle className="h-4 w-4 ml-1" title="Service Overdue!" />}
              {!isServiceOverdue(vehicle) && isServiceDueSoon(vehicle) && (
                <Wrench className="h-4 w-4 ml-1" title="Service Due Soon!" />
              )}
            </div>
            <div className="text-xs text-gray-500">Remaining: {milesToNext.toLocaleString()} Mi</div>
            
            <div className="pt-2 mt-1 border-t border-gray-100 text-xs">
               <div className="text-gray-600">Last Maint: {formatDate(vehicle.lastMaintenance)}</div>
               <div className={isExpiringOrExpired(vehicle.nextMaintenance) ? 'text-red-600 font-medium' : 'text-gray-600'}>
                 Next Maint: {formatDate(vehicle.nextMaintenance)}
               </div>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
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
          {can('vehicles', 'mileage') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSetServiceMileage(row.original);
              }}
              className="text-gray-600 hover:text-gray-800"
              title="Set Next Service"
            >
              <Wrench className="h-4 w-4" />
            </button>
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
  ].filter(Boolean);

  return (
    <DataTable
      data={sortedVehicles}
      columns={columns as any}
      onRowClick={(vehicle) => can('vehicles', 'view') && onView(vehicle)}
      rowClassName={(row) => {
        const vehicle = row.original;
        const now = new Date();
        const thirtyDays = addDays(now, 30);

        if (isServiceOverdue(vehicle)) return 'bg-red-100';
        if (isServiceDueSoon(vehicle)) return 'bg-yellow-100';

        const checkExp = (d?: Date | null) => d && new Date(d) < now;
        const checkSoon = (d?: Date | null) => d && new Date(d) <= thirtyDays && new Date(d) >= now;

        if (
          checkExp(vehicle.motExpiry) ||
          checkExp(vehicle.insuranceExpiry) ||
          checkExp(vehicle.nslExpiry) ||
          checkExp(vehicle.roadTaxExpiry)
        ) {
          return 'bg-red-50';
        }

        if (
          checkSoon(vehicle.motExpiry) ||
          checkSoon(vehicle.insuranceExpiry) ||
          checkSoon(vehicle.nslExpiry) ||
          checkSoon(vehicle.roadTaxExpiry)
        ) {
          return 'bg-yellow-50';
        }

        return '';
      }}
    />
  );
};

export default VehicleTable;