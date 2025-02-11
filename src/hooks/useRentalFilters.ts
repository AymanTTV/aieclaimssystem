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
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      
      // Get related vehicle and customer
      const vehicle = vehicles.find(v => v.id === rental.vehicleId);
      if (vehicle?.status === 'sold') return false;
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
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        switch (statusFilter) {
          case 'active':
            matchesStatus = rental.status === 'active';
            break;
          case 'scheduled':
            matchesStatus = rental.status === 'scheduled';
            break;
          case 'completed':
            matchesStatus = rental.status === 'completed';
            break;
          case 'cancelled':
            matchesStatus = rental.status === 'cancelled';
            break;
          case 'claim':
            matchesStatus = rental.reason === 'claim';
            break;
          default:
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