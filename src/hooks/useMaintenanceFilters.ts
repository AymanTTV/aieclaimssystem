// src/hooks/useMaintenanceFilters.ts

import { useState, useMemo } from 'react';
import { MaintenanceLog, Vehicle } from '../types';

export const useMaintenanceFilters = (logs: MaintenanceLog[], vehicles: Record<string, Vehicle>) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Get the vehicle for this log
      const vehicle = vehicles[log.vehicleId];
      
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        // Search by vehicle registration
        vehicle?.registrationNumber.toLowerCase().includes(searchLower) ||
        // Search by vehicle make/model
        `${vehicle?.make} ${vehicle?.model}`.toLowerCase().includes(searchLower) ||
        // Search by service provider
        log.serviceProvider.toLowerCase().includes(searchLower) ||
        // Search by location
        log.location.toLowerCase().includes(searchLower) ||
        // Search by description
        log.description.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || log.type === typeFilter;

      // Vehicle filter
      const matchesVehicle = !vehicleFilter || log.vehicleId === vehicleFilter;

      return matchesSearch && matchesStatus && matchesType && matchesVehicle;
    });
  }, [logs, vehicles, searchQuery, statusFilter, typeFilter, vehicleFilter]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    filteredLogs
  };
};
