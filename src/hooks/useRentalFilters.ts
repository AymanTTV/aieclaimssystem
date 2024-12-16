import { useState, useMemo } from 'react';
import { Rental } from '../types';

export const useRentalFilters = (rentals: Rental[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('');

  const filteredRentals = useMemo(() => {
    if (!rentals) return [];
    
    return rentals.filter(rental => {
      // Search filter - using optional chaining to prevent undefined errors
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        rental.customerId?.toString().toLowerCase().includes(searchLower) ||
        rental.vehicleId?.toString().toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || rental.status === statusFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || rental.type === typeFilter;

      // Vehicle filter
      const matchesVehicle = !vehicleFilter || rental.vehicleId === vehicleFilter;

      return matchesSearch && matchesStatus && matchesType && matchesVehicle;
    });
  }, [rentals, searchQuery, statusFilter, typeFilter, vehicleFilter]);

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