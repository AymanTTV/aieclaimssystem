// src/components/vehicles/VehicleTable.tsx

import React, { useMemo } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Vehicle } from '../../types';
import { Eye, Edit, AlertCircle, Trash2, Tag, DollarSign, RotateCw, FileText, Wrench, AlertTriangle, Key, Building2, Layers } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate } from '../../utils/dateHelpers';
import { isExpiringOrExpired, isServiceOverdue, isServiceDueSoon } from '../../utils/vehicleUtils';
import { addDays } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// --- HELPER FUNCTION FOR THE 28TH OF THE MONTH LOGIC ---
const checkNeedsMonthlyUpdate = (vehicle: any): boolean => {
  const now = new Date();
  
  let last28th = new Date(now.getFullYear(), now.getMonth(), 28);
  if (now.getDate() < 28) {
    last28th = new Date(now.getFullYear(), now.getMonth() - 1, 28);
  }
  last28th.setHours(0, 0, 0, 0);

  if (vehicle.mileageUpdates && Array.isArray(vehicle.mileageUpdates) && vehicle.mileageUpdates.length > 0) {
    const validDateTimes = vehicle.mileageUpdates.map((u: any) => {
      if (!u || !u.date) return 0;
      const d = u.date?.toDate ? u.date.toDate() : new Date(u.date);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }).filter((time: number) => time > 0);

    if (validDateTimes.length > 0) {
      const maxDateMs = Math.max(...validDateTimes);
      const lastUpdateDate = new Date(maxDateMs);
      lastUpdateDate.setHours(0, 0, 0, 0);
      return lastUpdateDate < last28th;
    }
  }


  if (vehicle.createdAt) {
    const createdDate = vehicle.createdAt?.toDate ? vehicle.createdAt.toDate() : new Date(vehicle.createdAt);
    if (!isNaN(createdDate.getTime())) {
       createdDate.setHours(0, 0, 0, 0);
       return createdDate < last28th;
    }
  }

  return true;
};

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
  selectedIds: Set<string>;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (id: string) => void;
  onAssignGarage: (vehicle: Vehicle) => void;
  onAssignType: (vehicle: Vehicle) => void; 
  onAssignGroup: (vehicle: Vehicle) => void; // ✅ New Prop
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
  onViewDocument,
  selectedIds,
  onToggleAll,
  onToggleOne,
  onAssignGarage,
  onAssignType,
  onAssignGroup,
}) => {
  const { can, isCompany } = usePermissions(); 
  const { user } = useAuth();

  const allSelected = vehicles.length > 0 && selectedIds.size === vehicles.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const checkWarrantyRed = (v: any): boolean => {
    // Condition 1: Vehicle has reached or exceeded 150,000 miles
    const currentMileage = v.mileage || 0;
    if (currentMileage >= 150000) return true;

    // Condition 2: Warranty End Date is within 14 days (or already expired)
    const wEnd = v.warrantyEndDate?.toDate 
      ? v.warrantyEndDate.toDate() 
      : (v.warrantyEndDate ? new Date(v.warrantyEndDate) : null);
      
    if (!wEnd) return false;
    
    // 14 days in milliseconds: 14 * 24 * 60 * 60 * 1000
    if (wEnd.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000) return true;
    
    return false;
  };

  // 1. MEMOIZE THE DATA
  const sortedVehicles = useMemo(() => {
    return [...vehicles].sort((a, b) => {
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
  }, [vehicles]);

  const money3 = (n: unknown) =>
    typeof n === 'number'
      ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 })
      : '-';

  // 2. MEMOIZE THE COLUMNS
  const columns = useMemo(() => {
    return [
      (!isCompany && can('vehicles', 'update')) ? {
        id: 'select',
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
            checked={allSelected}
            ref={(input) => { if (input) input.indeterminate = someSelected; }}
            onChange={(e) => onToggleAll(e.target.checked)}
          />
        ),
        cell: ({ row }: any) => (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleOne(row.original.id)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      } : null,

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
              {!isCompany && (
                <div className={`text-xs font-semibold mb-0.5 ${row.original.owner?.accountName ? 'text-blue-600' : 'text-gray-400 italic'}`}>
                    {row.original.owner?.accountName || 'No Account Assigned'}
                </div>
              )}
              <div className="font-medium">
                {row.original.make} {row.original.model}
              </div>
              <div className="text-sm text-gray-500">{row.original.registrationNumber}</div>
              
              <div className="flex flex-wrap gap-1 mt-1">
                {!isCompany && row.original.assignedGarageName && (
                   <div className="text-xs font-semibold text-orange-600 flex items-center bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                     <Building2 className="h-3 w-3 mr-1" /> {row.original.assignedGarageName}
                   </div>
                )}
                {/* ✅ Added Group Display Here */}
                {!isCompany && row.original.assignedGroupName && (
                   <div className="text-xs font-semibold text-blue-600 flex items-center bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                     <Layers className="h-3 w-3 mr-1" /> {row.original.assignedGroupName}
                   </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 ml-2">
                {!isCompany && can('vehicles', 'update') && (
                   <button
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation(); 
                        onAssignType(row.original); 
                      }}
                      className="p-1 rounded hover:bg-purple-50 text-purple-600"
                      title="Assign Vehicle Type"
                    >
                      <Tag className="h-4 w-4 pointer-events-none" />
                    </button>
                )}
            </div>

          </div>
        ),
      },

      (!isCompany && can('vehicles', 'owner')) ? {
        header: 'Owner',
        cell: ({ row }: any) => (
          <div>
            <div className="font-medium">{row.original.owner?.name || 'AIE Skyline'}</div>
          </div>
        ),
      } : null,

      {
        header: 'Status',
        cell: ({ row }: any) => {
          const vehicle = row.original;
          const statuses = vehicle.activeStatuses || [];

          const getDisplayStatus = (status: string) => {
            switch (status) {
              case 'rented': return 'hired';
              case 'scheduled-rental': return 'scheduled for hire';
              default: return status.replace('-', ' ');
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

      !isCompany ? {
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
      } : null,

      {
        header: 'Vehicle Documents',
        cell: ({ row }: any) => {
          const vehicle = row.original;
          const motExpiryDate = vehicle.motExpiry instanceof Date ? vehicle.motExpiry : vehicle.motExpiry?.toDate();
          // Get the Date properly for rendering
          const warrantyDate = vehicle.warrantyEndDate instanceof Date ? vehicle.warrantyEndDate : vehicle.warrantyEndDate?.toDate?.() || (vehicle.warrantyEndDate ? new Date(vehicle.warrantyEndDate) : null);

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
              {/* Warranty End Date */}
              {warrantyDate && (
                <div className={checkWarrantyRed(vehicle) ? 'text-red-600 font-medium' : ''}>
                  Warranty Exp: {formatDate(warrantyDate)}
                </div>
              )}
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
          
          const needsUpdate = checkNeedsMonthlyUpdate(vehicle);

          return (
            <div className="space-y-1">
              <div className={isServiceOverdue(vehicle) ? 'text-red-600 font-medium' : ''}>
                Current: {currentMileage.toLocaleString()} Mi
              </div>
              <div className="flex items-center font-medium">
                Next Service: {nextServiceMileageStored.toLocaleString()} Mi
              </div>
              <div className="text-xs text-gray-500">Remaining: {milesToNext.toLocaleString()} Mi</div>
              
              {milesToNext >= 0 && milesToNext < 5000 && (
                <div className="text-yellow-700 font-medium text-xs mt-2 flex items-center bg-yellow-100 p-1 rounded w-max">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Vehicle next service mileage is soon
                </div>
              )}
              
              {needsUpdate && (
                <div className="text-blue-700 font-medium text-xs mt-2 flex items-center bg-blue-100 p-1 rounded w-max">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Check vehicle current mileage and update
                </div>
              )}

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
        // 3. BULLETPROOF BUTTONS: Added type="button", preventDefault, and pointer-events-none to SVG
        cell: ({ row }: any) => (
          <div className="flex flex-wrap gap-2 items-center justify-end min-w-[120px]">
            
            {can('vehicles', 'copyId') && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigator.clipboard.writeText(row.original.id);
                  toast.success(`Copied DB ID: ${row.original.id}`, { duration: 4000, icon: '🔑' });
                }}
                className="p-1.5 rounded hover:bg-purple-50 text-purple-600"
                title="Copy Firebase Document ID"
              >
                <Key className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {can('vehicles', 'view') && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onView(row.original);
                }}
                className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                title="View Details"
              >
                <Eye className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {can('vehicles', 'update') && row.original.status !== 'sold' && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit(row.original);
                }}
                className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                title="Edit"
              >
                <Edit className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {!isCompany && can('vehicles', 'update') && (
               <button
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    onAssignGarage(row.original); 
                  }}
                  className="p-1.5 rounded hover:bg-orange-50 text-orange-600"
                  title="Assign/Update Garage"
                >
                  <Building2 className="h-4 w-4 pointer-events-none" />
                </button>
            )}

            {/* ✅ Added Group Assignment action button */}
            {!isCompany && can('vehicles', 'update') && (
               <button
                  type="button"
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    onAssignGroup(row.original); 
                  }}
                  className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                  title="Assign Finance Group"
                >
                  <Layers className="h-4 w-4 pointer-events-none" />
                </button>
            )}

            {can('vehicles', 'sale') && row.original.status !== 'sold' && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkAsSold(row.original);
                }}
                className="p-1.5 rounded hover:bg-green-50 text-green-600"
                title="Mark as Sold"
              >
                <DollarSign className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {can('vehicles', 'mileage') && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSetServiceMileage(row.original);
                }}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                title="Set Next Service"
              >
                <Wrench className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {can('vehicles', 'sale') && row.original.status === 'sold' && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUndoSale(row.original);
                }}
                className="p-1.5 rounded hover:bg-orange-50 text-orange-600"
                title="Undo Sale"
              >
                <RotateCw className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {can('vehicles', 'delete') && row.original.status === 'sold' && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(row.original);
                }}
                className="p-1.5 rounded hover:bg-red-50 text-red-600"
                title="Delete"
              >
                <Trash2 className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {can('vehicles', 'singleDoc') && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onGenerateDocument(row.original);
                }}
                className="p-1.5 rounded hover:bg-green-50 text-green-600"
                title="Generate Document"
              >
                <FileText className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {row.original.documentUrl && can('vehicles', 'singleDoc') && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onViewDocument(row.original.documentUrl!);
                }}
                className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                title="View Document"
              >
                <Eye className="h-4 w-4 pointer-events-none" />
              </button>
            )}
          </div>
        ),
      },
    ].filter(Boolean); 
  }, [
    can, isCompany, allSelected, someSelected, selectedIds, 
    onToggleAll, onToggleOne, onView, onEdit, onAssignGarage, 
    onAssignType, onAssignGroup, onMarkAsSold, onSetServiceMileage, 
    onUndoSale, onDelete, onGenerateDocument, onViewDocument
  ]);

  return (
    <DataTable
      data={sortedVehicles}
      columns={columns as any}
      onRowClick={(vehicle) => can('vehicles', 'view') && onView(vehicle)}
      rowClassName={(row) => {
        const vehicle = row.original;
        const now = new Date();
        const thirtyDays = addDays(now, 30);

        const currentMileage = vehicle.mileage || 0;
        const nextService = vehicle.nextServiceMileage || (currentMileage + 25000);
        const remaining = nextService - currentMileage;
        
        const needsUpdate = checkNeedsMonthlyUpdate(vehicle);

        if (remaining < 0) return 'bg-red-100 hover:bg-red-100'; 
        if (remaining < 5000) return 'bg-yellow-100 hover:bg-yellow-100'; 
        if (needsUpdate) return 'bg-blue-50 hover:bg-blue-50'; 

        if (isServiceOverdue(vehicle)) return 'bg-red-100 hover:bg-red-100';
        if (isServiceDueSoon(vehicle)) return 'bg-yellow-100 hover:bg-yellow-100';

        const checkExp = (d?: Date | null) => d && new Date(d) < now;
        const checkSoon = (d?: Date | null) => d && new Date(d) <= thirtyDays && new Date(d) >= now;

        if (
          checkExp(vehicle.motExpiry) ||
          checkExp(vehicle.insuranceExpiry) ||
          checkExp(vehicle.nslExpiry) ||
          checkExp(vehicle.roadTaxExpiry)
        ) {
          return 'bg-red-50 hover:bg-red-50';
        }

        if (
          checkSoon(vehicle.motExpiry) ||
          checkSoon(vehicle.insuranceExpiry) ||
          checkSoon(vehicle.nslExpiry) ||
          checkSoon(vehicle.roadTaxExpiry)
        ) {
          return 'bg-yellow-50 hover:bg-yellow-50';
        }

        return '';
      }}
    />
  );
};

export default VehicleTable;