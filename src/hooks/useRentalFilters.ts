// src/hooks/useRentalFilters.ts
import { useState, useMemo } from 'react';
import { Rental, Vehicle, Customer } from '../types';

export const useRentalFilters = (
  rentals: Rental[] = [], // Provide default empty array
  vehicles: Vehicle[] = [], // Provide default empty array  
  customers: Customer[] = [] // Provide default empty array
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('');

  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      
      // Get related vehicle and customer
      const vehicle = vehicles.find(v => v.id === rental.vehicleId);
      const customer = customers.find(c => c.id === rental.customerId);
      
      const matchesSearch = 
        // Vehicle search
        vehicle?.registrationNumber?.toLowerCase().includes(searchLower) ||
        vehicle?.make?.toLowerCase().includes(searchLower) ||
        vehicle?.model?.toLowerCase().includes(searchLower) ||
        // Customer search  
        customer?.name?.toLowerCase().includes(searchLower) ||
        customer?.mobile?.toLowerCase().includes(searchLower) ||
        customer?.email?.toLowerCase().includes(searchLower) ||
        // Rental type search
        rental.type?.toLowerCase().includes(searchLower) ||
        rental.reason?.toLowerCase().includes(searchLower) ||
        false; // Fallback if no matches

      // Status filter
      const matchesStatus = statusFilter === 'all' || rental.status === statusFilter;

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
