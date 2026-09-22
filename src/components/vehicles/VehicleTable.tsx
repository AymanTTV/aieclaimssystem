// src/components/vehicles/VehicleTable.tsx

import React, { useMemo } from 'react';
import { DataTable } from '../DataTable/DataTable';
import { Vehicle } from '../../types';
import { Eye, Edit, AlertCircle, Trash2, Tag, DollarSign, RotateCw, FileText, Wrench, AlertTriangle, Key, Building2, Layers, Briefcase } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDate } from '../../utils/dateHelpers';
import { isExpiringOrExpired, isServiceOverdue, isServiceDueSoon } from '../../utils/vehicleUtils';
import { addDays } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

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
  onAssignGroup: (vehicle: Vehicle) => void; 
  onAssignDepartment: (vehicle: Vehicle) => void; // ✅ New Prop
}

const VehicleTable: React.FC<VehicleTableProps> = ({
  vehicles, onView, onEdit, onDelete, onMarkAsSold, onUndoSale, onGenerateDocument, onSetServiceMileage,
  onViewDocument, selectedIds, onToggleAll, onToggleOne, onAssignGarage, onAssignType, onAssignGroup, onAssignDepartment,
}) => {
  const { can, isCompany } = usePermissions(); 
  const { user } = useAuth();

  const allSelected = vehicles.length > 0 && selectedIds.size === vehicles.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const checkWarrantyRed = (v: any): boolean => {
    const currentMileage = v.mileage || 0;
    if (currentMileage >= 150000) return true;
    const wEnd = v.warrantyEndDate?.toDate ? v.warrantyEndDate.toDate() : (v.warrantyEndDate ? new Date(v.warrantyEndDate) : null);
    if (!wEnd) return false;
    if (wEnd.getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000) return true;
    return false;
  };

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
        const aNextServiceMileage = typeof vehicle.nextServiceMileage === 'number' ? vehicle.nextServiceMileage : aMileage + 25000;

        if (aMileage >= aNextServiceMileage) count += 15;
        if (aMileage < aNextServiceMileage && aNextServiceMileage - aMileage <= 1000) count += 7;

        const checkSoon = (d: Date | null | undefined) => d ? new Date(d) <= thirtyDays && new Date(d) >= now : false;

        if (checkSoon(vehicle.motExpiry)) count += 5;
        if (checkSoon(vehicle.insuranceExpiry)) count += 5;
        if (checkSoon(vehicle.nslExpiry)) count += 5;
        if (checkSoon(vehicle.roadTaxExpiry)) count += 5;

        return count;
      };

      const aCount = countExpiringDocs(a);
      const bCount = countExpiringDocs(b);

      if (aCount !== bCount) return bCount - aCount;
      return (a.make || '').localeCompare(b.make || '');
    });
  }, [vehicles]);

  const money3 = (n: unknown) => typeof n === 'number' ? n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : '-';

  const columns = useMemo(() => {
    return [
      (!isCompany && can('vehicles', 'update')) ? {
        id: 'select',
        header: (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600 rounded border-slate-400 focus:ring-blue-500 cursor-pointer accent-blue-600"
            checked={allSelected}
            ref={(input) => { if (input) input.indeterminate = someSelected; }}
            onChange={(e) => onToggleAll(e.target.checked)}
            aria-label="Select all vehicles"
          />
        ),
        cell: ({ row }: any) => (
          <input
            type="checkbox"
            className="form-checkbox h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
            checked={selectedIds.has(row.original.id)}
            onChange={() => onToggleOne(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select vehicle ${row.original.registrationNumber}`}
          />
        ),
      } : null,

      {
        header: 'Vehicle',
        cell: ({ row }: any) => (
          <div className="flex items-center space-x-3.5">
            {row.original.image ? (
              <img
                src={row.original.image}
                alt={`${row.original.make} ${row.original.model}`}
                className="h-11 w-11 object-cover rounded-xl border border-slate-200/80 shadow-2xs shrink-0"
              />
            ) : (
              <div className="h-11 w-11 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                <span className="text-slate-400 text-xs font-semibold">No img</span>
              </div>
            )}
            <div>
              {!isCompany && (
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 ${row.original.owner?.accountName ? 'text-blue-600' : 'text-slate-400 italic'}`}>
                  {row.original.owner?.accountName || 'No Account Assigned'}
                </div>
              )}
              <div className="font-bold text-slate-900 text-sm tracking-tight leading-snug">
                {row.original.make} {row.original.model}
              </div>
              <div className="mt-0.5">
                <span className="inline-block bg-[#FFD100] text-black font-extrabold font-mono text-[11px] px-2 py-0.5 rounded border border-amber-300 shadow-2xs tracking-wider uppercase">
                  {row.original.registrationNumber}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {!isCompany && row.original.assignedGarageName && (
                  <div className="text-[11px] font-semibold text-orange-700 flex items-center bg-white border border-orange-200 px-2 py-0.5 rounded-md shadow-2xs">
                    <Building2 className="h-3 w-3 mr-1 text-orange-500" /> {row.original.assignedGarageName}
                  </div>
                )}
                {!isCompany && row.original.assignedGroupName && (
                  <div className="text-[11px] font-semibold text-blue-700 flex items-center bg-white border border-blue-200 px-2 py-0.5 rounded-md shadow-2xs">
                    <Layers className="h-3 w-3 mr-1 text-blue-500" /> {row.original.assignedGroupName}
                  </div>
                )}
                {/* ✅ Added Department Badge */}
                {!isCompany && row.original.assignedDepartmentName && (
                  <div className="text-[11px] font-semibold text-teal-700 flex items-center bg-white border border-teal-200 px-2 py-0.5 rounded-md shadow-2xs">
                    <Briefcase className="h-3 w-3 mr-1 text-teal-500" /> {row.original.assignedDepartmentName}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
              {!isCompany && can('vehicles', 'update') && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAssignType(row.original); }}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors shadow-2xs cursor-pointer active:scale-95"
                  title="Assign Vehicle Type"
                >
                  <Tag className="h-3.5 w-3.5 pointer-events-none" />
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
            <div className="font-semibold text-slate-800 text-sm whitespace-nowrap">
              {row.original.owner?.name || 'AIE Skyline'}
            </div>
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

          if (vehicle.status === 'sold') return <div className="flex flex-col space-y-1"><StatusBadge status="sold" /></div>;

          if (statuses.length > 0) {
            return (
              <div className="flex flex-col space-y-1">
                {statuses.map((s: string, i: number) => <StatusBadge key={i} status={getDisplayStatus(s)} />)}
              </div>
            );
          }

          return <div className="flex flex-col space-y-1"><StatusBadge status={getDisplayStatus(vehicle.status || 'available')} /></div>;
        },
      },

      !isCompany ? {
        header: 'Rental Rates',
        cell: ({ row }: any) => {
          const v = row.original;
          return (
            <div className="space-y-1 text-xs text-slate-700 whitespace-nowrap">
              <div><span className="text-slate-500 font-normal">Wk:</span> <strong className="text-slate-900 font-semibold">£{money3(v.weeklyRentalPrice)}</strong>{typeof v.weeklyInsuranceAmount === 'number' && <span className="text-slate-400 text-[11px] ml-1">(Ins: £{money3(v.weeklyInsuranceAmount)})</span>}</div>
              <div><span className="text-slate-500 font-normal">Day:</span> <strong className="text-slate-900 font-semibold">£{money3(v.dailyRentalPrice)}</strong>{typeof v.dailyInsuranceAmount === 'number' && <span className="text-slate-400 text-[11px] ml-1">(Ins: £{money3(v.dailyInsuranceAmount)})</span>}</div>
              <div><span className="text-slate-500 font-normal">Claim:</span> <strong className="text-slate-900 font-semibold">£{money3(v.claimRentalPrice)}</strong>{typeof v.claimInsuranceAmount === 'number' && <span className="text-slate-400 text-[11px] ml-1">(Ins: £{money3(v.claimInsuranceAmount)})</span>}</div>
            </div>
          );
        },
      } : null,

      {
        header: 'Vehicle Documents',
        cell: ({ row }: any) => {
          const vehicle = row.original;
          const motExpiryDate = vehicle.motExpiry instanceof Date ? vehicle.motExpiry : vehicle.motExpiry?.toDate();
          const warrantyDate = vehicle.warrantyEndDate instanceof Date ? vehicle.warrantyEndDate : vehicle.warrantyEndDate?.toDate?.() || (vehicle.warrantyEndDate ? new Date(vehicle.warrantyEndDate) : null);

          return (
            <div className="space-y-1 text-xs whitespace-nowrap">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">MOT Date:</span>
                <span className={isExpiringOrExpired(vehicle.motTestDate) ? 'text-rose-600 font-bold' : 'text-slate-800 font-medium'}>
                  {formatDate(vehicle.motTestDate)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">MOT Exp:</span>
                <span className={isExpiringOrExpired(motExpiryDate) ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-slate-800 font-medium'}>
                  {formatDate(motExpiryDate)}
                  {isExpiringOrExpired(motExpiryDate) && <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Exp</span>}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Insurance:</span>
                <span className={isExpiringOrExpired(vehicle.insuranceExpiry) ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-slate-800 font-medium'}>
                  {formatDate(vehicle.insuranceExpiry)}
                  {isExpiringOrExpired(vehicle.insuranceExpiry) && <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Exp</span>}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">NSL:</span>
                <span className={isExpiringOrExpired(vehicle.nslExpiry) ? 'text-rose-600 font-bold' : 'text-slate-800 font-medium'}>
                  {formatDate(vehicle.nslExpiry)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Road Tax:</span>
                <span className={isExpiringOrExpired(vehicle.roadTaxExpiry) ? 'text-rose-600 font-bold' : 'text-slate-800 font-medium'}>
                  {formatDate(vehicle.roadTaxExpiry)}
                </span>
              </div>
              {warrantyDate && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Warranty:</span>
                  <span className={checkWarrantyRed(vehicle) ? 'text-rose-600 font-bold' : 'text-slate-800 font-medium'}>
                    {formatDate(warrantyDate)}
                  </span>
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
          const nextServiceMileageStored = typeof vehicle.nextServiceMileage === 'number' ? vehicle.nextServiceMileage : currentMileage + 25000;
          const milesToNext = nextServiceMileageStored - currentMileage;
          const needsUpdate = checkNeedsMonthlyUpdate(vehicle);

          return (
            <div className="space-y-1 text-xs whitespace-nowrap">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Current:</span>
                <span className={isServiceOverdue(vehicle) ? 'text-rose-600 font-bold font-mono' : 'text-slate-900 font-bold font-mono'}>
                  {currentMileage.toLocaleString()} Mi
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Next Service:</span>
                <span className="text-slate-700 font-mono font-medium">{nextServiceMileageStored.toLocaleString()} Mi</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400 text-[11px]">Remaining:</span>
                <span className={`font-mono text-[11px] ${milesToNext < 0 ? 'text-rose-600 font-bold' : milesToNext < 5000 ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>
                  {milesToNext.toLocaleString()} Mi
                </span>
              </div>
              
              {milesToNext >= 0 && milesToNext < 5000 && (
                <div className="text-amber-800 font-semibold text-[11px] mt-1.5 flex items-center bg-white border border-amber-300 px-2 py-0.5 rounded-md w-max shadow-2xs">
                  <AlertTriangle className="h-3 w-3 mr-1 text-amber-600 shrink-0" /> Service soon
                </div>
              )}
              {needsUpdate && (
                <div className="text-blue-800 font-semibold text-[11px] mt-1 flex items-center bg-white border border-blue-300 px-2 py-0.5 rounded-md w-max shadow-2xs">
                  <AlertCircle className="h-3 w-3 mr-1 text-blue-600 shrink-0" /> Check & Update
                </div>
              )}

              <div className="pt-1.5 mt-1 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-0.5">
                <div>Last Maint: <span className="text-slate-700 font-medium">{formatDate(vehicle.lastMaintenance)}</span></div>
                <div className={isExpiringOrExpired(vehicle.nextMaintenance) ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                  Next Maint: <span className="font-medium">{formatDate(vehicle.nextMaintenance)}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        header: 'Actions',
        cell: ({ row }: any) => (
          <div 
            className="flex flex-wrap gap-1.5 items-center justify-end min-w-[140px]"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            {can('vehicles', 'copyId') && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigator.clipboard.writeText(row.original.id); toast.success(`Copied DB ID: ${row.original.id}`, { duration: 4000, icon: '🔑' }); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Copy Firebase Document ID"
              >
                <Key className="h-4 w-4 pointer-events-none" />
              </button>
            )}
            {can('vehicles', 'view') && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onView(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="View Details"
              >
                <Eye className="h-4 w-4 pointer-events-none" />
              </button>
            )}
            {can('vehicles', 'update') && row.original.status !== 'sold' && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Edit Vehicle"
              >
                <Edit className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {!isCompany && can('vehicles', 'update') && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAssignGarage(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Assign/Update Garage"
              >
                <Building2 className="h-4 w-4 pointer-events-none" />
              </button>
            )}
            {!isCompany && can('vehicles', 'update') && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAssignGroup(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Assign Finance Group"
              >
                <Layers className="h-4 w-4 pointer-events-none" />
              </button>
            )}
            {/* ✅ Added Department Assignment Action */}
            {!isCompany && can('vehicles', 'update') && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAssignDepartment(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Assign Department"
              >
                <Briefcase className="h-4 w-4 pointer-events-none" />
              </button>
            )}

            {can('vehicles', 'sale') && row.original.status !== 'sold' && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkAsSold(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Mark as Sold"
              >
                <DollarSign className="h-4 w-4 pointer-events-none" />
              </button>
            )}
            {can('vehicles', 'mileage') && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSetServiceMileage(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Set Next Service"
              >
                <Wrench className="h-4 w-4 pointer-events-none" />
              </button>
            )}
            {can('vehicles', 'sale') && row.original.status === 'sold' && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUndoSale(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Undo Sale"
              >
                <RotateCw className="h-4 w-4 pointer-events-none" />
              </button>
            )}
            {can('vehicles', 'delete') && row.original.status === 'sold' && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Delete"
              >
                <Trash2 className="h-4 w-4 pointer-events-none" />
              </button>
            )}
            {can('vehicles', 'singleDoc') && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onGenerateDocument(row.original); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
                title="Generate Document"
              >
                <FileText className="h-4 w-4 pointer-events-none" />
              </button>
            )}
            {row.original.documentUrl && can('vehicles', 'singleDoc') && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewDocument(row.original.documentUrl!); }}
                className="h-8 w-8 min-w-[32px] flex items-center justify-center rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-90"
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
    onAssignType, onAssignGroup, onAssignDepartment, onMarkAsSold, onSetServiceMileage, 
    onUndoSale, onDelete, onGenerateDocument, onViewDocument
  ]);

  return (
    <DataTable
      theme="navy"
      data={sortedVehicles}
      columns={columns as any}
      onRowClick={(vehicle) => can('vehicles', 'view') && onView(vehicle)}
    />
  );
};

export default VehicleTable;