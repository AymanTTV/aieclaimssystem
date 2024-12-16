import { useState, useMemo } from 'react';
import { MaintenanceLog } from '../types';

export const useMaintenanceFilters = (logs: MaintenanceLog[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        log.description.toLowerCase().includes(searchLower) ||
        log.serviceProvider.toLowerCase().includes(searchLower) ||
        log.location.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || log.type === typeFilter;

      // Vehicle filter
      const matchesVehicle = !vehicleFilter || log.vehicleId === vehicleFilter;

      return matchesSearch && matchesStatus && matchesType && matchesVehicle;
    });
  }, [logs, searchQuery, statusFilter, typeFilter, vehicleFilter]);

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