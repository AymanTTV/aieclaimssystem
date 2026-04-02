// src/hooks/useVehicleFilters.ts

import * as React from 'react';
import type { Vehicle } from '../types';
import { needsMonthlyMileageUpdate } from '../utils/vehicleUtils';

type StatusFilter = 'all' | 'available' | 'hired' | 'scheduled-rental' | 'maintenance';

// --- NEW HELPER FUNCTION FOR THE 28TH OF THE MONTH LOGIC ---
const checkNeedsMonthlyUpdate = (vehicle: any): boolean => {
  const now = new Date();
  
  // Find the most recent 28th of a month
  let last28th = new Date(now.getFullYear(), now.getMonth(), 28);
  if (now.getDate() < 28) {
    // If today is before the 28th, the threshold is the 28th of the previous month
    last28th = new Date(now.getFullYear(), now.getMonth() - 1, 28);
  }
  last28th.setHours(0, 0, 0, 0);

  // 1. SAFELY SCAN THE ENTIRE ARRAY FOR THE NEWEST DATE
  if (vehicle.mileageUpdates && Array.isArray(vehicle.mileageUpdates) && vehicle.mileageUpdates.length > 0) {
    
    // Extract all valid dates and convert them to milliseconds
    const validDateTimes = vehicle.mileageUpdates.map((u: any) => {
      if (!u || !u.date) return 0;
      const d = u.date?.toDate ? u.date.toDate() : new Date(u.date);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }).filter((time: number) => time > 0);

    if (validDateTimes.length > 0) {
      // Find the absolute highest (newest) time in the array
      const maxDateMs = Math.max(...validDateTimes);
      const lastUpdateDate = new Date(maxDateMs);
      lastUpdateDate.setHours(0, 0, 0, 0);
      
      // If the newest date is older than the 28th, trigger warning
      return lastUpdateDate < last28th;
    }
  }

  // 2. Fallback to creation date if no updates exist
  if (vehicle.createdAt) {
    const createdDate = vehicle.createdAt?.toDate ? vehicle.createdAt.toDate() : new Date(vehicle.createdAt);
    if (!isNaN(createdDate.getTime())) {
       createdDate.setHours(0, 0, 0, 0);
       return createdDate < last28th;
    }
  }

  // 3. Absolute fallback
  return true;
};
// -----------------------------------------------------------
// ------------------------------------

export function useVehicleFilters(vehicles: Vehicle[]) {
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [makeFilter, setMakeFilter] = React.useState<string>('all');
  const [showSold, setShowSold] = React.useState<boolean>(false);
  
  const [expiryFilter, setExpiryFilter] = React.useState<string>('');
  
  // NEW: Account Filter State
  const [accountFilter, setAccountFilter] = React.useState<string>('all');

  const uniqueMakes = React.useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach(v => {
      if (v?.make) set.add(String(v.make));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehicles = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const normalize = (s?: string | null) => String(s ?? '').toLowerCase();

    // --- EXPIRY LOGIC CONFIGURATION ---
    const now = new Date();
    // "Within 2 weeks" = 14 days from now
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(now.getDate() + 14);

    const matchesExpiryDate = (dateVal?: Date | string | null) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return d <= twoWeeksFromNow;
    };
    // ----------------------------------

    const matchesSearch = (v: Vehicle) => {
      if (!q) return true;
      const fields: Array<string | undefined | null> = [
        v.registrationNumber, v.make, v.model, (v as any).color,
        (v as any).vin, v.owner?.name, v.owner?.accountName
      ];
      const composed = [
        [v.make, v.model].filter(Boolean).join(' '),
        [v.owner?.name, v.registrationNumber].filter(Boolean).join(' '),
      ];
      return [...fields, ...composed].some(val =>
        String(val ?? '').toLowerCase().includes(q)
      );
    };

    const getDaysSinceLastMileageUpdate = (v: any) => {
  if (v.mileageUpdates?.length) {
    const d = v.mileageUpdates[v.mileageUpdates.length - 1].date;
    return (new Date().getTime() - (d?.toDate ? d.toDate() : new Date(d)).getTime()) / 86400000;
  }
  if (v.updatedAt) {
    const d = v.updatedAt;
    return (new Date().getTime() - (d?.toDate ? d.toDate() : new Date(d)).getTime()) / 86400000;
  }
  return 999;
};

    const matchesStatus = (v: Vehicle) => {
      if (statusFilter === 'all') return true;
      const base = normalize(v.status);
      const active: string[] = Array.isArray((v as any).activeStatuses) ? (v as any).activeStatuses : [];
      if (statusFilter === 'hired') {
        return base === 'hired' || base === 'rented' || active.includes('rented');
      }
      if (statusFilter === 'scheduled-rental') {
        return base === 'scheduled-rental' || active.includes('scheduled-rental');
      }
      return base === statusFilter;
    };

    const matchesMake = (v: Vehicle) =>
      makeFilter === 'all' || normalize(v.make) === normalize(makeFilter);

    const matchesExpiryFilter = (v: Vehicle) => {
      if (!expiryFilter) return true;

      switch (expiryFilter) {
        case 'mot': return matchesExpiryDate(v.motExpiry);
        case 'nsl': return matchesExpiryDate(v.nslExpiry);
        case 'tax': return matchesExpiryDate(v.roadTaxExpiry);
        case 'insurance': return matchesExpiryDate(v.insuranceExpiry);
        case 'maintenance': {
          const dateDue = matchesExpiryDate(v.nextMaintenance);
          const currentMileage = v.mileage || 0;
          const nextService = v.nextServiceMileage || (currentMileage + 25000);
          return dateDue || (nextService - currentMileage) <= 2500;
        }
        // NEW: Service soon filter (< 5000 miles)
        case 'service_soon': {
          const remaining = (v.nextServiceMileage || 0) - (v.mileage || 0);
          return remaining >= 0 && remaining < 5000;
        }
        // FIXED: Update mileage filter logic
        case 'needs_update': {
          return checkNeedsMonthlyUpdate(v);
        }
        default: return true;
      }
    };

    // NEW: Filter by Account
    const matchesAccount = (v: Vehicle) => {
        if (!accountFilter || accountFilter === 'all') return true;
        if (accountFilter === 'no_account_assigned') {
            return !v.owner?.accountId;
        }
        return v.owner?.accountId === accountFilter;
    };

    return vehicles.filter(v => {
      // Sold vehicles filter
      if (showSold) {
        return normalize(v.status) === 'sold' && matchesSearch(v) && matchesAccount(v);
      }
      // Active vehicles filter
      return (
        normalize(v.status) !== 'sold' && 
        matchesSearch(v) && 
        matchesStatus(v) && 
        matchesMake(v) &&
        matchesExpiryFilter(v) &&
        matchesAccount(v) // Applied here
      );
    });
    
  }, [vehicles, searchQuery, statusFilter, makeFilter, showSold, expiryFilter, accountFilter]);

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
    expiryFilter,
    setExpiryFilter,
    // Export account filter
    accountFilter,
    setAccountFilter,
  };
}