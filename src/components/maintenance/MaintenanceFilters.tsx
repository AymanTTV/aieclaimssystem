import React from 'react';
import { Search } from 'lucide-react';
import { Vehicle } from '../../types';

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
  // NEW PROPS
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
  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm">
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by Order #, Invoice #, Reg, Provider, Description..."
          className="form-input pl-10 w-full"
        />
      </div>

      {/* Filters grid: 1 col → 2 on small phones → 3 on md → 4 on lg+ */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Types</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Vehicle</label>
          <select
            value={vehicleFilter}
            onChange={(e) => onVehicleFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} — {v.registrationNumber}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment Status</label>
          <select
            value={paymentStatusFilter}
            onChange={(e) => onPaymentStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
          >
            <option value="all">All Payment Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Date From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
            className="form-input mt-1 w-full"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Date To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
            className="form-input mt-1 w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default MaintenanceFilters;