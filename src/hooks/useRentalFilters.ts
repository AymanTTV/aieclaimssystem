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
        rental.reason?.toLowerCase().includes(searchLower) ||
        false;

      // Status filter
      let matchesStatus: boolean;
      if (statusFilter === 'all') {
        // hide "completed" in the 'all' view
        matchesStatus = rental.status !== 'completed';
      } else {
        matchesStatus = rental.status === statusFilter;
      }

      // Type & vehicle & reason filters
      const matchesType = typeFilter === 'all' || rental.type === typeFilter;
      const matchesVehicle = !vehicleFilter || rental.vehicleId === vehicleFilter;
      let matchesReason = true;
      if (reasonFilter !== 'all') {
        matchesReason = rental.reason === reasonFilter;
      }

      // --- OVERLAP DATE LOGIC ---
      const rentalStartMs = rental.startDate?.getTime() ?? null;
      const rentalEndMs   = rental.endDate?.getTime()   ?? null;

      let filterStartMs: number | null = null;
      let filterEndMs:   number | null = null;
      if (startDateFilter) filterStartMs = Date.parse(startDateFilter + 'T00:00:00Z');
      if (endDateFilter)   filterEndMs   = Date.parse(endDateFilter   + 'T23:59:59.999Z');

      let matchesDateRange = true;
      if (filterStartMs !== null || filterEndMs !== null) {
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
