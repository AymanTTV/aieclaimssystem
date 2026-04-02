// src/components/rentals/RentalFilters.tsx
import React from 'react';
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
  paymentStatusFilter: string; // <-- ADDED
  onPaymentStatusFilterChange: (status: string) => void; // <-- ADDED
  startDateFilter: string;
  onStartDateChange: (date: string) => void;
  endDateFilter: string;
  onEndDateChange: (date: string) => void;
  vehicles: Vehicle[];
  /** Only disables non-date filters */
  isDisabled: boolean;
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
  paymentStatusFilter, // <-- ADDED
  onPaymentStatusFilterChange, // <-- ADDED
  startDateFilter,
  onStartDateChange,
  endDateFilter,
  onEndDateChange,
  vehicles,
  isDisabled,
}) => {
  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm w-full">
      {/* Filters grid: 1 col → 2 on small phones → 3 on md → 4 on lg+ */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
            disabled={isDisabled}
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Hired</option>
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
            disabled={isDisabled}
          >
            <option value="all">All Types</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="claim">Claim</option>
          </select>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <select
            value={reasonFilter}
            onChange={(e) => onReasonFilterChange(e.target.value as RentalReason | 'all')}
            className="form-select mt-1 w-full"
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
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Payment</label>
          <select
            value={paymentStatusFilter}
            onChange={(e) => onPaymentStatusFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
            disabled={isDisabled}
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="pending">Pending (Unpaid)</option>
          </select>
        </div>

        {/* Vehicle */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Vehicle</label>
          <select
            value={vehicleFilter}
            onChange={(e) => onVehicleFilterChange(e.target.value)}
            className="form-select mt-1 w-full"
            disabled={isDisabled}
          >
            <option value="">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} — {v.registrationNumber}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">From</label>
          <input
            type="date"
            id="startDate"
            value={startDateFilter}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="form-input mt-1 w-full"
          />
        </div>

        {/* To Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">To</label>
          <input
            type="date"
            id="endDate"
            value={endDateFilter}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="form-input mt-1 w-full"
          />
        </div>
      </div>
    </div>
  );
};

export default RentalFilters;
