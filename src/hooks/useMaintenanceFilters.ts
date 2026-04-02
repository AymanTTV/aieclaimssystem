// src/hooks/useMaintenanceFilters.ts
import { useState, useMemo } from 'react';
import { MaintenanceLog, Vehicle } from '../types';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { usePermissions } from './usePermissions';

export const useMaintenanceFilters = (
  logs: MaintenanceLog[],
  vehicles: Record<string, Vehicle>
) => {
  const { can, isCompany } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const filteredLogs = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const canViewCompleted = can('maintenance', 'completed') && !isCompany;

    return logs.filter(log => {
      // ✅ SECURITY RULE 1: Hide completed/cancelled logs if the user lacks permission
      if (!canViewCompleted && (log.status === 'completed' || log.status === 'cancelled')) {
         return false;
      }

      // ✅ SECURITY RULE 2: COMPANY GHOST RECORD FIX
      if (isCompany && log.vehicleId && !vehicles[log.vehicleId]) {
        return false;
      }

      // ✅ NEW: DEFAULT DASHBOARD VIEW
      // Hide completely finished records at first, UNLESS the user interacts with any filter/search.
      const isDefaultState = 
        statusFilter === 'all' && 
        paymentStatusFilter === 'all' && 
        vehicleFilter === 'all' && 
        typeFilter === 'all' &&
        !searchQuery && 
        !dateRange.from && 
        !dateRange.to;

      if (isDefaultState) {
        // A record is considered "finished" if it's cancelled, OR if it's both completed AND paid.
        // (If it's completed but unpaid, it will still show so you know to collect payment).
        // For company users (who don't track payments), just hide completed entirely.
        const isCancelled = log.status === 'cancelled';
        const isCompletedAndPaid = log.status === 'completed' && log.paymentStatus === 'paid';
        const isCompanyFinished = isCompany && log.status === 'completed';

        if (isCancelled || isCompletedAndPaid || isCompanyFinished) {
            return false;
        }
      }

      const vehicle = vehicles[log.vehicleId || ''] || (log.vehicleDetails as any);

      const matchesSearch = (() => {
        if (!searchQuery) return true;
        
        const vehicleText = vehicle 
          ? `${vehicle.make} ${vehicle.model} ${vehicle.registrationNumber}`.toLowerCase() 
          : (log.vehicleId ? log.vehicleId.toLowerCase() : '');

        return (
          vehicleText.includes(searchLower) ||
          (log.serviceProvider || '').toLowerCase().includes(searchLower) ||
          (log.location || '').toLowerCase().includes(searchLower) ||
          (log.description || '').toLowerCase().includes(searchLower) ||
          (log.orderNumber || '').toLowerCase().includes(searchLower) ||
          (log.invoiceNumber || '').toLowerCase().includes(searchLower)
        );
      })();

      const matchesStatus =
        statusFilter === 'all' ||
        (log.status || '').toLowerCase() === statusFilter.toLowerCase();

      const matchesType =
        typeFilter === 'all' ||
        (log.type || '').toLowerCase() === typeFilter.toLowerCase();

      const matchesVehicle =
        !vehicleFilter || vehicleFilter === 'all' || log.vehicleId === vehicleFilter;

      const matchesPaymentStatus =
        paymentStatusFilter === 'all' ||
        (log.paymentStatus || '').toLowerCase() === paymentStatusFilter.toLowerCase();

      // Date Range Logic
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
    dateRange,
    can,
    isCompany
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
    dateRange,
    setDateRange,
    filteredLogs
  };
};