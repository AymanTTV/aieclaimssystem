// src/hooks/useMaintenanceFilters.ts
import { useState, useMemo } from 'react';
import { MaintenanceLog, Vehicle, isOffRoadAccidentLog } from '../types';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { usePermissions } from './usePermissions';
import { useAuth } from '../context/AuthContext'; 

export const useMaintenanceFilters = (
  logs: MaintenanceLog[],
  vehicles: Record<string, Vehicle>
) => {
  const { can, isCompany } = usePermissions();
  const { user } = useAuth(); 
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [roadConditionFilter, setRoadConditionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const filteredLogs = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    const canViewCompleted = can('maintenance', 'completed') && !isCompany;
    
    // ✅ Normalize company name for safe matching (ignoring case and extra spaces)
    const companyNameLower = (user?.companyName || user?.name || '').toLowerCase().trim();

    return logs.filter(log => {
      // ✅ SECURITY RULE 1: Hide completed/cancelled logs if the user lacks permission
      if (!canViewCompleted && (log.status === 'completed' || log.status === 'cancelled')) {
         return false;
      }

      // ✅ SECURITY RULE 2: STRICT SERVICE PROVIDER CHECK FOR COMPANIES
      if (isCompany) {
        // 1. Ghost Record check: If it has a vehicleId but we don't have access to that vehicle, hide it
        if (log.vehicleId && !vehicles[log.vehicleId]) {
          return false;
        }

        const isOffRoadAccident = isOffRoadAccidentLog(log) || log.ticketCategory === 'ACCIDENT DAMAGE' || log.category === 'ACCIDENT DAMAGE';
        const isAssignedVehicle = Boolean(log.vehicleId && vehicles[log.vehicleId]);

        // If it's an off-road accident record for their vehicle, keep it visible
        if (!isOffRoadAccident) {
          // 2. STRICT NAME CHECK: The Service Provider MUST match this company's name.
          const providerLower = (log.serviceProvider || '').trim().toLowerCase();
          
          // If a service provider is listed and it's NOT this company, hide the record!
          if (providerLower && providerLower !== companyNameLower) {
            return false; 
          }

          // 3. Fallback: If service provider is entirely blank, ensure the vehicle is assigned to them
          if (!providerLower && !isAssignedVehicle) {
            return false;
          }
        }
      }

      // ✅ NEW: DEFAULT DASHBOARD VIEW
      const isDefaultState = 
        statusFilter === 'all' && 
        paymentStatusFilter === 'all' && 
        vehicleFilter === 'all' && 
        typeFilter === 'all' &&
        roadConditionFilter === 'all' &&
        !searchQuery && 
        !dateRange.from && 
        !dateRange.to;

      if (isDefaultState) {
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

        const typeFormatted = (log.type || '').replace(/-/g, ' ').toLowerCase();
        const partsText = (log.parts || [])
          .map(p => `${p.name || ''} ${p.partNumber || ''}`)
          .join(' ')
          .toLowerCase();

        return (
          vehicleText.includes(searchLower) ||
          typeFormatted.includes(searchLower) ||
          (log.type || '').toLowerCase().includes(searchLower) ||
          (log.status || '').toLowerCase().includes(searchLower) ||
          (log.paymentStatus || '').toLowerCase().includes(searchLower) ||
          (log.serviceProvider || '').toLowerCase().includes(searchLower) ||
          (log.location || '').toLowerCase().includes(searchLower) ||
          (log.description || '').toLowerCase().includes(searchLower) ||
          (log.notes || '').toLowerCase().includes(searchLower) ||
          (log.orderNumber || '').toLowerCase().includes(searchLower) ||
          (log.invoiceNumber || '').toLowerCase().includes(searchLower) ||
          partsText.includes(searchLower)
        );
      })();

      const matchesStatus = (() => {
        if (statusFilter === 'all') return true;
        const target = statusFilter.toLowerCase().trim();
        const logStatus = (log.status || '').toLowerCase().trim();

        if (target === 'off-road' || target === 'off-road (vor)' || target === 'vor') {
          return (
            logStatus === 'off-road' ||
            logStatus === 'off-road (vor)' ||
            logStatus === 'off road (vor)' ||
            logStatus === 'vor' ||
            isOffRoadAccidentLog(log)
          );
        }

        if (target === 'parts-backorder' || target === 'awaiting-parts') {
          return (
            logStatus === 'parts-backorder' ||
            logStatus === 'parts backorder' ||
            logStatus === 'awaiting-parts' ||
            logStatus === 'awaiting parts' ||
            logStatus === 'backorder'
          );
        }

        if (target === 'pending' || target === 'awaiting-approval') {
          return (
            logStatus === 'pending' ||
            logStatus === 'awaiting-approval' ||
            logStatus === 'awaiting approval'
          );
        }

        if (target === 'workshop') {
          return logStatus === 'workshop' || logStatus === 'in workshop';
        }

        return logStatus === target;
      })();

      const matchesType =
        typeFilter === 'all' ||
        (log.type || '').toLowerCase() === typeFilter.toLowerCase();

      const matchesVehicle =
        !vehicleFilter || vehicleFilter === 'all' || log.vehicleId === vehicleFilter;

      const matchesPaymentStatus =
        paymentStatusFilter === 'all' ||
        (log.paymentStatus || '').toLowerCase() === paymentStatusFilter.toLowerCase();

      // Road Condition / Non-drivable due to accident filter
      const matchesRoadCondition = (() => {
        if (roadConditionFilter === 'all') return true;
        const isAccidentOffRoad = isOffRoadAccidentLog(log);
        if (roadConditionFilter === 'off-road-accident') {
          return isAccidentOffRoad;
        }
        if (roadConditionFilter === 'all-off-road') {
          return isAccidentOffRoad || log.isOffRoad === true || log.isNonDrivable === true;
        }
        if (roadConditionFilter === 'drivable') {
          return !isAccidentOffRoad && !log.isOffRoad && !log.isNonDrivable;
        }
        return true;
      })();

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
        matchesRoadCondition &&
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
    roadConditionFilter,
    dateRange,
    can,
    isCompany,
    user 
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
    roadConditionFilter,
    setRoadConditionFilter,
    dateRange,
    setDateRange,
    filteredLogs
  };
};