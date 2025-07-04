import { useState, useMemo } from 'react';
import { MaintenanceLog, Vehicle } from '../types';

export const useMaintenanceFilters = (logs: MaintenanceLog[], vehicles: Record<string, Vehicle>) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('');

  const filteredLogs = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    return logs.filter(log => {
      const vehicle = vehicles[log.vehicleId];

      const matchesSearch = (() => {
        if (!searchQuery) return true;

        return (
          vehicle?.registrationNumber.toLowerCase().includes(searchLower) ||
          `${vehicle?.make} ${vehicle?.model}`.toLowerCase().includes(searchLower) ||
          log.serviceProvider.toLowerCase().includes(searchLower) ||
          log.location.toLowerCase().includes(searchLower) ||
          log.description.toLowerCase().includes(searchLower)
        );
      })();

      const matchesStatus = statusFilter === 'all' || log.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType = typeFilter === 'all' || log.type.toLowerCase() === typeFilter.toLowerCase();

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