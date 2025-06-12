// src/hooks/useRentalFilters.ts
import { useState, useMemo } from 'react';
import { Rental, Vehicle, Customer } from '../types';

export const useRentalFilters = (
  rentals: Rental[] = [],
  vehicles: Vehicle[] = [],
  customers: Customer[] = []
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('');

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

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'claim') {
          matchesStatus = rental.reason === 'claim';
        } else {
          matchesStatus = rental.status === statusFilter;
        }
      }

      // Type filter
      const matchesType = typeFilter === 'all' || rental.type === typeFilter;

      // Vehicle filter
      const matchesVehicle = !vehicleFilter || rental.vehicleId === vehicleFilter;

      return matchesSearch && matchesStatus && matchesType && matchesVehicle;
    });
  }, [rentals, vehicles, customers, searchQuery, statusFilter, typeFilter, vehicleFilter]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    filteredRentals
  };
};
