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

      // Get related vehicle and customer
      const vehicle = vehicles.find(v => v.id === rental.vehicleId);
      const customer = customers.find(c => c.id === rental.customerId);

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

      // --- MODIFIED LOGIC ---
      // This logic now hides 'completed' rentals from the 'all' view.
      let matchesStatus: boolean;
      if (statusFilter === 'all') {
        // If 'All Status' is selected, only show rentals that are NOT completed.
        matchesStatus = rental.status !== 'completed';
      } else {
        // If a specific status is selected (e.g., 'completed', 'active'), match it directly.
        matchesStatus = rental.status === statusFilter;
      }

      // Type filter
      const matchesType = typeFilter === 'all' || rental.type === typeFilter;

      // Vehicle filter
      const matchesVehicle = !vehicleFilter || rental.vehicleId === vehicleFilter;

      // Reason filter logic - CORRECTED
      let matchesReason = true;
      if (reasonFilter !== 'all') {
        // If a specific reason is selected, match it directly
        matchesReason = rental.reason === reasonFilter;
      }
      // If reasonFilter === 'all', matchesReason remains true, showing all rentals regardless of reason.

      // Date filter logic - REFINED FOR INTERSECTION AND TIMEZONE CONSISTENCY
      const rentalStartMs = rental.startDate ? rental.startDate.getTime() : null;
      const rentalEndMs = rental.endDate ? rental.endDate.getTime() : null;

      let filterStartMs: number | null = null;
      let filterEndMs: number | null = null;

      if (startDateFilter) {
        filterStartMs = Date.parse(startDateFilter + 'T00:00:00Z');
      }
      if (endDateFilter) {
        filterEndMs = Date.parse(endDateFilter + 'T23:59:59.999Z');
      }

      let matchesDateRange = true;

      if (filterStartMs !== null || filterEndMs !== null) {
        if (rentalStartMs === null && rentalEndMs === null) {
          matchesDateRange = false;
        } else {
          const effectiveFilterStartMs = filterStartMs !== null ? filterStartMs : new Date('1900-01-01T00:00:00Z').getTime();
          const effectiveFilterEndMs = filterEndMs !== null ? filterEndMs : new Date('2100-12-31T23:59:59.999Z').getTime();

          if (rentalStartMs !== null && rentalEndMs !== null) {
            matchesDateRange =
              rentalStartMs <= effectiveFilterEndMs &&
              rentalEndMs >= effectiveFilterStartMs;
          }
          else if (rentalEndMs !== null) {
            matchesDateRange = rentalEndMs >= effectiveFilterStartMs && rentalEndMs <= effectiveFilterEndMs;
          }
          else if (rentalStartMs !== null) {
            matchesDateRange = rentalStartMs >= effectiveFilterStartMs && rentalStartMs <= effectiveFilterEndMs;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesType && matchesVehicle && matchesReason && matchesDateRange;
    });
  }, [rentals, vehicles, customers, searchQuery, statusFilter, typeFilter, vehicleFilter, reasonFilter, startDateFilter, endDateFilter]);

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
    filteredRentals
  };
};