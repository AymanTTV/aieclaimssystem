// src/hooks/useMaintenanceFilters.ts
import { useState, useMemo } from 'react';
import { MaintenanceLog, Vehicle } from '../types';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export const useMaintenanceFilters = (
  logs: MaintenanceLog[],
  vehicles: Record<string, Vehicle>
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  
  // NEW: Date Range State
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const filteredLogs = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();

    return logs.filter(log => {
      const vehicle = vehicles[log.vehicleId || ''] || (log.vehicleDetails as any);

      // Expanded Search Logic
      const matchesSearch = (() => {
        if (!searchQuery) return true;
        
        const vehicleText = vehicle 
          ? `${vehicle.make} ${vehicle.model} ${vehicle.registrationNumber}`.toLowerCase() 
          : '';

        return (
          vehicleText.includes(searchLower) ||
          log.serviceProvider.toLowerCase().includes(searchLower) ||
          log.location.toLowerCase().includes(searchLower) ||
          log.description.toLowerCase().includes(searchLower) ||
          // NEW FIELDS
          log.orderNumber?.toLowerCase().includes(searchLower) ||
          log.invoiceNumber?.toLowerCase().includes(searchLower)
        );
      })();

      const matchesStatus =
        statusFilter === 'all' ||
        log.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === 'all' ||
        log.type.toLowerCase() === typeFilter.toLowerCase();

      const matchesVehicle =
        !vehicleFilter || log.vehicleId === vehicleFilter;

      const matchesPaymentStatus =
        paymentStatusFilter === 'all' ||
        log.paymentStatus.toLowerCase() === paymentStatusFilter.toLowerCase();

      // NEW: Date Range Logic
      let matchesDate = true;
      if (dateRange.from || dateRange.to) {
        const logDate = log.date instanceof Date ? log.date : (log.date as any).toDate();
        
        if (dateRange.from) {
          const start = startOfDay(parseISO(dateRange.from));
          if (logDate < start) matchesDate = false;
        }
        
        if (dateRange.to) {
          const end = endOfDay(parseISO(dateRange.to));
          if (logDate > end) matchesDate = false;
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesVehicle &&
        matchesPaymentStatus &&
        matchesDate
      );
    });
  }, [
    logs,
    vehicles,
    searchQuery,
    statusFilter,
    typeFilter,
    vehicleFilter,
    paymentStatusFilter,
    dateRange // Add dependency
  ]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    // Export new state
    dateRange,
    setDateRange,
    filteredLogs,
  };
};