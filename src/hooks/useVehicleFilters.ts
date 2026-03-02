// src/hooks/useVehicleFilters.ts

import * as React from 'react';
import type { Vehicle } from '../types';

type StatusFilter = 'all' | 'available' | 'hired' | 'scheduled-rental' | 'maintenance';

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

    // Filter by Expiry
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
          const milesDue = (nextService - currentMileage) <= 1000;
          return dateDue || milesDue;
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