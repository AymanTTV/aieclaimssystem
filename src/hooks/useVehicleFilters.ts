import { useState, useMemo } from 'react';
import { Vehicle } from '../types';

export const useVehicleFilters = (vehicles: Vehicle[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [makeFilter, setMakeFilter] = useState('all');
  const [showSold, setShowSold] = useState(false);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      // Don't show sold vehicles unless explicitly requested
      
      if (showSold) {
        if (vehicle.status !== 'sold') {
          return false;
        }
      } else {
        // If showSold is false, hide sold vehicles
        if (vehicle.status === 'sold') {
          return false;
        }
      }

      // Search filter
      // Search filter
const searchLower = searchQuery.toLowerCase();
const matchesSearch =
  vehicle.registrationNumber.toLowerCase().includes(searchLower) ||
  vehicle.make.toLowerCase().includes(searchLower) ||
  vehicle.model.toLowerCase().includes(searchLower) ||
  vehicle.vin.toLowerCase().includes(searchLower) ||
  // Safely access owner.name using optional chaining and provide a default empty string if owner or owner.name is undefined
  ((vehicle.owner?.name ?? '')).toLowerCase().includes(searchLower); // MODIFIED LINE - changed || to ?? for nullish coalescing

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        switch (statusFilter) {
          case 'hired':
            matchesStatus = vehicle.status === 'rented' || vehicle.status === 'scheduled-rental';
            break;
          case 'maintenance':
            matchesStatus = vehicle.status === 'maintenance' || vehicle.status === 'scheduled-maintenance';
            break;
          case 'claims':
            matchesStatus = vehicle.status === 'claim';
            break;
          case 'available':
            matchesStatus = vehicle.status === 'available';
            break;
          default:
            matchesStatus = vehicle.status === statusFilter;
        }
      }

      // Make filter
      const matchesMake = makeFilter === 'all' || vehicle.make === makeFilter;

      return matchesSearch && matchesStatus && matchesMake;
    });
  }, [vehicles, searchQuery, statusFilter, makeFilter, showSold]);

  const uniqueMakes = useMemo(() => {
    return Array.from(new Set(vehicles.map(vehicle => vehicle.make))).sort();
  }, [vehicles]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    makeFilter,
    setMakeFilter,
    showSold,
    setShowSold,
    filteredVehicles,
    uniqueMakes,
  };
};