// src/components/rentals/RentalFilters.tsx
import React, { useMemo } from 'react';
import { Vehicle, Rental } from '../../types';
import SearchableSelect from '../ui/SearchableSelect';

interface RentalFiltersProps {
  statusFilter: string[];
  onStatusFilterChange: (status: string[]) => void;
  typeFilter: string[];
  onTypeFilterChange: (type: string[]) => void;
  vehicleFilter: string[];
  onVehicleFilterChange: (vehicleIds: string[]) => void;
  reasonFilter: string[];
  onReasonFilterChange: (reasons: string[]) => void;
  paymentStatusFilter: string[];
  onPaymentStatusFilterChange: (status: string[]) => void;
  startDateFilter: string;
  onStartDateChange: (date: string) => void;
  endDateFilter: string;
  onEndDateChange: (date: string) => void;
  vehicles: Vehicle[];
  rentals?: Rental[]; // ✅ Added rentals to extract substitution vehicles
  isDisabled: boolean;
}

const statusOptions = [
  { id: 'all', label: 'All Status' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'active', label: 'Hired' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const typeOptions = [
  { id: 'all', label: 'All Types' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'claim', label: 'Claim' },
];

const reasonOptions = [
  { id: 'all', label: 'All Reasons' },
  { id: 'hired', label: 'Hired' },
  { id: 'claim', label: 'Claim' },
  { id: 'o/d', label: 'O/D' },
  { id: 'staff', label: 'Staff' },
  { id: 'workshop', label: 'Workshop' },
  { id: 'c-substitute', label: 'C Substitute' },
  { id: 'h-substitute', label: 'H Substitute' },
];

const paymentOptions = [
  { id: 'all', label: 'All Payments' },
  { id: 'paid', label: 'Paid' },
  { id: 'partially_paid', label: 'Partially Paid' },
  { id: 'pending', label: 'Pending (Unpaid)' },
];

const RentalFilters: React.FC<RentalFiltersProps> = ({
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  vehicleFilter,
  onVehicleFilterChange,
  reasonFilter,
  onReasonFilterChange,
  paymentStatusFilter,
  onPaymentStatusFilterChange,
  startDateFilter,
  onStartDateChange,
  endDateFilter,
  onEndDateChange,
  vehicles,
  rentals = [],
  isDisabled,
}) => {
  
  // ✅ Dynamically build vehicle options including external substitutions
  const vehicleOptions = useMemo(() => {
    const options = [
      { id: 'all', label: 'All Vehicles' },
      ...vehicles.map((v) => ({
        id: v.id,
        label: `${v.make} ${v.model}`,
        subLabel: v.registrationNumber,
      })),
    ];

    const fleetRegs = new Set(vehicles.map(v => (v.registrationNumber || '').toLowerCase().replace(/\s+/g, '')));
    const subsMap = new Map();

    rentals.forEach(r => {
      (r.hireSubstitutionDetails || []).forEach(sub => {
        if (sub.registration) {
          const rawReg = sub.registration;
          const cleanReg = rawReg.toLowerCase().replace(/\s+/g, '');
          // If the sub vehicle is NOT already in the main fleet list, add it
          if (!fleetRegs.has(cleanReg) && !subsMap.has(cleanReg)) {
            subsMap.set(cleanReg, {
              id: `sub_${cleanReg}`, // Special ID prefix
              label: `${sub.make || 'Unknown'} ${sub.model || ''} (Sub)`,
              subLabel: rawReg.toUpperCase(),
            });
          }
        }
      });
    });

    return [...options, ...Array.from(subsMap.values())];
  }, [vehicles, rentals]);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <SearchableSelect
          label="Status"
          labelClassName="searchable-select-label block text-sm font-bold text-slate-200 mb-1.5"
          options={statusOptions}
          value={statusFilter}
          onChange={(val) => onStatusFilterChange(val as string[])}
          isMulti={true}
          disabled={isDisabled}
        />

        <SearchableSelect
          label="Type"
          labelClassName="searchable-select-label block text-sm font-bold text-slate-200 mb-1.5"
          options={typeOptions}
          value={typeFilter}
          onChange={(val) => onTypeFilterChange(val as string[])}
          isMulti={true}
          disabled={isDisabled}
        />

        <SearchableSelect
          label="Reason"
          labelClassName="searchable-select-label block text-sm font-bold text-slate-200 mb-1.5"
          options={reasonOptions}
          value={reasonFilter}
          onChange={(val) => onReasonFilterChange(val as string[])}
          isMulti={true}
          disabled={isDisabled}
        />

        <SearchableSelect
          label="Payment"
          labelClassName="searchable-select-label block text-sm font-bold text-slate-200 mb-1.5"
          options={paymentOptions}
          value={paymentStatusFilter}
          onChange={(val) => onPaymentStatusFilterChange(val as string[])}
          isMulti={true}
          disabled={isDisabled}
        />

        <SearchableSelect
          label="Vehicle"
          labelClassName="searchable-select-label block text-sm font-bold text-slate-200 mb-1.5"
          options={vehicleOptions}
          value={vehicleFilter}
          onChange={(val) => onVehicleFilterChange(val as string[])}
          isMulti={true}
          disabled={isDisabled}
          placeholder="Search Vehicles..."
        />

        <div className="space-y-1">
          <label htmlFor="startDate" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">From</label>
          <input
            type="date"
            id="startDate"
            value={startDateFilter}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full min-h-[38px] px-3 py-1.5 text-sm bg-[#0F111A] text-white border border-[#2B314E] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 [color-scheme:dark]"
            disabled={isDisabled}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="endDate" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">To</label>
          <input
            type="date"
            id="endDate"
            value={endDateFilter}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="w-full min-h-[38px] px-3 py-1.5 text-sm bg-[#0F111A] text-white border border-[#2B314E] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-50 [color-scheme:dark]"
            disabled={isDisabled}
          />
        </div>
      </div>
    </div>
  );
};

export default RentalFilters;