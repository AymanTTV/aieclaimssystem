// src/components/maintenance/MaintenanceFilters.tsx
import React, { useMemo } from 'react';
import { Search, Filter } from 'lucide-react';
import { Vehicle } from '../../types';
import SearchableSelect from '../ui/SearchableSelect';
import { usePermissions } from '../../hooks/usePermissions';

interface MaintenanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  vehicleFilter: string;
  onVehicleFilterChange: (vehicleId: string) => void;
  paymentStatusFilter: string;
  onPaymentStatusFilterChange: (status: string) => void;
  dateRange: { from: string; to: string };
  onDateRangeChange: (range: { from: string; to: string }) => void;
  vehicles: Vehicle[];
  categories: string[];
}

const MaintenanceFilters: React.FC<MaintenanceFiltersProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  vehicleFilter,
  onVehicleFilterChange,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  dateRange,
  onDateRangeChange,
  vehicles,
  categories,
}) => {
  const { isCompany, can } = usePermissions();
  const canViewCompleted = can('maintenance', 'completed') && !isCompany;

  const statusOptions = useMemo(() => {
    const opts = [
      { id: 'all', label: 'All Status' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'in-progress', label: 'In Progress' }
    ];
    if (canViewCompleted) {
       opts.push({ id: 'completed', label: 'Completed' }, { id: 'cancelled', label: 'Cancelled' });
    }
    return opts;
  }, [canViewCompleted]);

  const typeOptions = useMemo(() => [
    { id: 'all', label: 'All Types' },
    ...categories.map(c => ({ id: c, label: c.replace(/-/g, ' ') }))
  ], [categories]);

  const vehicleOptions = useMemo(() => [
    { id: 'all', label: 'All Vehicles' },
    ...vehicles.map(v => ({ id: v.id, label: `${v.make} ${v.model} - ${v.registrationNumber}` }))
  ], [vehicles]);

  const paymentStatusOptions = useMemo(() => [
    { id: 'all', label: 'All Payment Status' },
    { id: 'paid', label: 'Paid' },
    { id: 'unpaid', label: 'Unpaid' },
    { id: 'partially_paid', label: 'Partially Paid' }
  ], []);

  const labelStyle = "block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1";

  return (
    <div className="bg-[#16192B] p-4 sm:p-5 rounded-2xl shadow-xl border border-[#2B314E]">
      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-slate-300 mb-4 pb-2 border-b border-[#2B314E]/60">
        <Filter className="w-4 h-4 text-blue-400" />
        <span>Maintenance Filters</span>
      </div>

      {/* Grid Setup: 
        Mobile: 1 column
        Tablet (sm): 2 columns
        Desktop (lg): 4 columns
        This ensures perfectly balanced 2 lines on desktop.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        
        {/* Search - Takes 2 columns to balance the first row */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
           <label className={labelStyle}>Search</label>
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-slate-400" />
             </div>
             <input
               type="text"
               autoComplete="off"
               data-lpignore="true"
               value={searchQuery}
               onChange={(e) => onSearchChange(e.target.value)}
               placeholder="Search type, vehicle, reg, invoice, notes..."
               className="block w-full pl-9 pr-3 py-2 bg-[#0F111A] text-white border border-[#2B314E] rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-500 h-[42px]"
             />
           </div>
        </div>

        <div className="col-span-1">
           <SearchableSelect
             label="Status"
             labelClassName={labelStyle}
             options={statusOptions}
             value={statusFilter}
             onChange={(val) => onStatusFilterChange(val || 'all')}
             isClearable
           />
        </div>

        <div className="col-span-1">
           <SearchableSelect
             label="Type"
             labelClassName={labelStyle}
             options={typeOptions}
             value={typeFilter}
             onChange={(val) => onTypeFilterChange(val || 'all')}
             isClearable
           />
        </div>

        <div className="col-span-1">
           <SearchableSelect
             label="Vehicle"
             labelClassName={labelStyle}
             options={vehicleOptions}
             value={vehicleFilter}
             onChange={(val) => onVehicleFilterChange(val || 'all')}
             isClearable
           />
        </div>

        {!isCompany && (
           <div className="col-span-1">
              <SearchableSelect
                label="Payment Status"
                labelClassName={labelStyle}
                options={paymentStatusOptions}
                value={paymentStatusFilter}
                onChange={(val) => onPaymentStatusFilterChange(val || 'all')}
                isClearable
              />
           </div>
        )}

        <div className="col-span-1">
          <label className={labelStyle}>Date From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            className="block w-full bg-[#0F111A] text-white border border-[#2B314E] rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark] px-3 h-[42px]"
          />
        </div>

        <div className="col-span-1">
          <label className={labelStyle}>Date To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            className="block w-full bg-[#0F111A] text-white border border-[#2B314E] rounded-xl text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [color-scheme:dark] px-3 h-[42px]"
          />
        </div>
      </div>
    </div>
  );
};

export default MaintenanceFilters;