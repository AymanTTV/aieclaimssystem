// src/hooks/useRentalFilters.ts
import { useState, useMemo } from 'react';
import { Rental, Vehicle, Customer, RentalReason } from '../types';

export const useRentalFilters = (
  rentals: Rental[] = [],
  vehicles: Vehicle[] = [],
  customers: Customer[] = []
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState<RentalReason | 'all'>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      const searchLower = searchQuery.toLowerCase();

      // Lookup related vehicle & customer
      const vehicle = vehicles.find(v => v.id === rental.vehicleId);
      const customer = customers.find(c => c.id === rental.customerId);

      // Text search across fields
      const matchesSearch =
        vehicle?.registrationNumber?.toLowerCase().includes(searchLower) ||
        vehicle?.make?.toLowerCase().includes(searchLower) ||
        vehicle?.model?.toLowerCase().includes(searchLower) ||
        customer?.name?.toLowerCase().includes(searchLower) ||
        customer?.mobile?.toLowerCase().includes(searchLower) ||
        customer?.email?.toLowerCase().includes(searchLower) ||
        rental.type?.toLowerCase().includes(searchLower) ||
        rental.status?.toLowerCase().includes(searchLower) ||
        rental.reason?.toLowerCase().includes(searchLower) ||
        // ✅ ADDED: Allow search by Rental Agreement Number
        (rental.rentalAgreementNumber && rental.rentalAgreementNumber.toLowerCase().includes(searchLower));

      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = rental.status === statusFilter;
      }

      let matchesType = true;
      if (typeFilter !== 'all') {
        matchesType = rental.type === typeFilter;
      }

      let matchesVehicle = true;
      if (vehicleFilter) {
        matchesVehicle = rental.vehicleId === vehicleFilter;
      }

      let matchesReason = true;
      if (reasonFilter !== 'all') {
        matchesReason = rental.reason === reasonFilter;
      }

      let matchesDateRange = true;
      if (startDateFilter || endDateFilter) {
        const rentalStartMs = rental.startDate instanceof Date
          ? rental.startDate.getTime()
          : (rental.startDate as any)?.toDate?.().getTime() || null;
        const rentalEndMs = rental.endDate instanceof Date
          ? rental.endDate.getTime()
          : (rental.endDate as any)?.toDate?.().getTime() || null;

        const filterStartMs = startDateFilter ? new Date(startDateFilter).getTime() : null;
        const filterEndMs   = endDateFilter   ? new Date(endDateFilter).getTime()   : null;

        // Effective range for "overlap" check or simple bounds?
        // Usually: (StartA <= EndB) and (EndA >= StartB) for overlap
        // Here implementing a simpler inclusion check:
        // if StartFilter exists, rental must start on/after it
        // if EndFilter exists, rental must end on/before it
        
        // However, user might want overlap. Let's stick to strict bounds based on UI labels "From" / "To"
        // Adjusting logic to standard "inclusive range":
        //   Rental is within range if:
        //   (rentalStart >= filterStart) AND (rentalEnd <= filterEnd)
        //   But let's keep it robust for partial inputs.

        const effectiveFilterStartMs =
          filterStartMs ?? new Date('1900-01-01T00:00:00Z').getTime();
        const effectiveFilterEndMs   =
          filterEndMs   ?? new Date('2100-12-31T23:59:59.999Z').getTime();

        if (rentalStartMs !== null && rentalEndMs !== null) {
          matchesDateRange =
            rentalStartMs <= effectiveFilterEndMs &&
            rentalEndMs >= effectiveFilterStartMs;
        } else if (rentalStartMs !== null) {
          matchesDateRange =
            rentalStartMs <= effectiveFilterEndMs &&
            rentalStartMs >= effectiveFilterStartMs;
        } else if (rentalEndMs !== null) {
          matchesDateRange =
            rentalEndMs <= effectiveFilterEndMs &&
            rentalEndMs >= effectiveFilterStartMs;
        } else {
          matchesDateRange = false;
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesVehicle &&
        matchesReason &&
        matchesDateRange
      );
    });
  }, [
    rentals,
    vehicles,
    customers,
    searchQuery,
    statusFilter,
    typeFilter,
    vehicleFilter,
    reasonFilter,
    startDateFilter,
    endDateFilter,
  ]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    reasonFilter,
    setReasonFilter,
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
    filteredRentals,
  };
};