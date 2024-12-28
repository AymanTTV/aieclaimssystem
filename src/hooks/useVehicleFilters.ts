// src/hooks/useVehicleFilters.ts
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
      if (vehicle.status === 'sold' && !showSold) {
        return false;
      }

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        vehicle.registrationNumber.toLowerCase().includes(searchLower) ||
        vehicle.make.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        vehicle.vin.toLowerCase().includes(searchLower) ||
        vehicle.owner?.name.toLowerCase().includes(searchLower);

      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
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
