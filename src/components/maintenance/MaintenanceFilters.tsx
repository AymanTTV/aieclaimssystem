// src/components/maintenance/MaintenanceFilters.tsx
import React, { useMemo } from 'react';
import { Search } from 'lucide-react';
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

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
      {/* Grid Setup: 
        Mobile: 1 column
        Tablet (sm): 2 columns
        Desktop (lg): 4 columns
        This ensures perfectly balanced 2 lines on desktop.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        
        {/* Search - Takes 2 columns to balance the first row */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-2">
           <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
           <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Search className="h-4 w-4 text-gray-400" />
             </div>
             <input
               type="text"
               value={searchQuery}
               onChange={(e) => onSearchChange(e.target.value)}
               placeholder="Search records, reg, invoice..."
               className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary sm:text-sm h-[42px]"
             />
           </div>
        </div>

        <div className="col-span-1">
           <SearchableSelect
             label="Status"
             options={statusOptions}
             value={statusFilter}
             onChange={(val) => onStatusFilterChange(val || 'all')}
             isClearable
           />
        </div>

        <div className="col-span-1">
           <SearchableSelect
             label="Category"
             options={typeOptions}
             value={typeFilter}
             onChange={(val) => onTypeFilterChange(val || 'all')}
             isClearable
           />
        </div>

        <div className="col-span-1">
           <SearchableSelect
             label="Vehicle"
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
                options={paymentStatusOptions}
                value={paymentStatusFilter}
                onChange={(val) => onPaymentStatusFilterChange(val || 'all')}
                isClearable
              />
           </div>
        )}

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 h-[42px]"
          />
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm px-3 h-[42px]"
          />
        </div>
      </div>
    </div>
  );
};

export default MaintenanceFilters;