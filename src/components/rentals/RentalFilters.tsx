// src/components/rentals/RentalFilters.tsx
import React from 'react';
import { Search } from 'lucide-react'; // This import isn't used in this component. You can remove it.
import { Vehicle, RentalReason } from '../../types';

interface RentalFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  vehicleFilter: string;
  onVehicleFilterChange: (vehicleId: string) => void;
  reasonFilter: RentalReason | 'all';
  onReasonFilterChange: (reason: RentalReason | 'all') => void;
  startDateFilter: string;
  onStartDateChange: (date: string) => void;
  endDateFilter: string;
  onEndDateChange: (date: string) => void;
  vehicles: Vehicle[];
  isDisabled: boolean; // This prop will now only disable non-date filters
}

const RentalFilters: React.FC<RentalFiltersProps> = ({
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  vehicleFilter,
  onVehicleFilterChange,
  reasonFilter,
  onReasonFilterChange,
  startDateFilter,
  onStartDateChange,
  endDateFilter,
  onEndDateChange,
  vehicles,
  isDisabled, // We still use this, but selectively
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
      {/* Status Filter */}
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        // Apply disabled only if isDisabled is true
        disabled={isDisabled} 
      >
        <option value="all">All Status</option>
        <option value="scheduled">Scheduled</option>
        <option value="active">Hired</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {/* Type Filter */}
      <select
        value={typeFilter}
        onChange={(e) => onTypeFilterChange(e.target.value)}
        className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        // Apply disabled only if isDisabled is true
        disabled={isDisabled} 
      >
        <option value="all">All Types</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="claim">Claim</option>
      </select>

      {/* Reason Filter */}
      <select
        value={reasonFilter}
        onChange={(e) => onReasonFilterChange(e.target.value as RentalReason | 'all')}
        className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        // Apply disabled only if isDisabled is true
        disabled={isDisabled} 
      >
        <option value="all">All Reasons</option>
        <option value="hired">Hired</option>
        <option value="claim">Claim</option>
        <option value="o/d">O/D</option>
        <option value="staff">Staff</option>
        <option value="workshop">Workshop</option>
        <option value="c-substitute">C Substitute</option>
        <option value="h-substitute">H Substitute</option>
      </select>

      {/* Vehicle Filter */}
      <select
        value={vehicleFilter}
        onChange={(e) => onVehicleFilterChange(e.target.value)}
        className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
        // Apply disabled only if isDisabled is true
        disabled={isDisabled} 
      >
        <option value="">All Vehicles</option>
        {vehicles.map((vehicle) => (
          <option key={vehicle.id} value={vehicle.id}>
            {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
          </option>
        ))}
      </select>

      {/* Date Filters - These should NOT be disabled by the `isDisabled` prop */}
      <div className="flex items-center gap-2">
        <label htmlFor="startDate" className="text-gray-700 text-sm">From:</label>
        <input
          type="date"
          id="startDate"
          value={startDateFilter}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="block w-48 pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          // REMOVE disabled={isDisabled} from here
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="endDate" className="text-gray-700 text-sm">To:</label>
        <input
          type="date"
          id="endDate"
          value={endDateFilter}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="block w-48 pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          // REMOVE disabled={isDisabled} from here
        />
      </div>
    </div>
  );
};

export default RentalFilters;