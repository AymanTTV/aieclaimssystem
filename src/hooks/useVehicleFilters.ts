// src/hooks/useVehicleFilters.ts

import * as React from 'react';
import type { Vehicle } from '../types';

type StatusFilter = 'all' | 'available' | 'hired' | 'scheduled-rental' | 'maintenance';

const checkNeedsMonthlyUpdate = (vehicle: any): boolean => {
  const now = new Date();

  let last28th = new Date(now.getFullYear(), now.getMonth(), 28);
  if (now.getDate() < 28) {
    last28th = new Date(now.getFullYear(), now.getMonth() - 1, 28);
  }
  last28th.setHours(0, 0, 0, 0);

  if (vehicle.mileageUpdates && Array.isArray(vehicle.mileageUpdates) && vehicle.mileageUpdates.length > 0) {
    const validDateTimes = vehicle.mileageUpdates.map((u: any) => {
      if (!u || !u.date) return 0;
      const d = u.date?.toDate ? u.date.toDate() : new Date(u.date);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }).filter((time: number) => time > 0);

    if (validDateTimes.length > 0) {
      const maxDateMs = Math.max(...validDateTimes);
      const lastUpdateDate = new Date(maxDateMs);
      lastUpdateDate.setHours(0, 0, 0, 0);
      return lastUpdateDate < last28th;
    }
  }

  if (vehicle.createdAt) {
    const createdDate = vehicle.createdAt?.toDate ? vehicle.createdAt.toDate() : new Date(vehicle.createdAt);
    if (!isNaN(createdDate.getTime())) {
       createdDate.setHours(0, 0, 0, 0);
       return createdDate < last28th;
    }
  }

  return true;
};

export function useVehicleFilters(vehicles: Vehicle[]) {
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [makeFilter, setMakeFilter] = React.useState<string>('all');
  const [showSold, setShowSold] = React.useState<boolean>(false);
  const [typeFilter, setTypeFilter] = React.useState<string>('all'); 
  const [expiryFilter, setExpiryFilter] = React.useState<string>('');
  const [ageFilter, setAgeFilter] = React.useState<string>('all'); 
  
  const [accountFilter, setAccountFilter] = React.useState<string>('all');
  const [garageFilter, setGarageFilter] = React.useState<string>('all');
  
  const [groupFilter, setGroupFilter] = React.useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('all'); // ✅ Added
  const [ownerFilter, setOwnerFilter] = React.useState<string>('all');

  const uniqueMakes = React.useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach(v => {
      if (v?.make) set.add(String(v.make));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const uniqueOwners = React.useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach(v => {
      if (v.owner?.name) set.add(v.owner.name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  const filteredVehicles = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const normalize = (s?: string | null) => String(s ?? '').toLowerCase();

    const now = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(now.getDate() + 14);

    const matchesExpiryDate = (dateVal?: Date | string | null) => {
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      return d <= twoWeeksFromNow;
    };

    const matchesSearch = (v: Vehicle) => {
      if (!q) return true;
      const fields: Array<string | undefined | null> = [
        v.registrationNumber, v.make, v.model, (v as any).color,
        (v as any).vin, v.owner?.name, v.owner?.accountName, v.assignedGarageName,
        v.assignedGroupName, v.assignedDepartmentName // ✅ Added to Search
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
        case 'service_soon': {
          const remaining = (v.nextServiceMileage || 0) - (v.mileage || 0);
          return remaining >= 0 && remaining < 5000;
        }
        case 'needs_update': {
          return checkNeedsMonthlyUpdate(v);
        }
        case 'warranty': return matchesExpiryDate(v.warrantyEndDate);
        default: return true;
      }
    };

    const matchesAccount = (v: Vehicle) => {
        if (!accountFilter || accountFilter === 'all') return true;
        if (accountFilter === 'no_account_assigned') return !v.owner?.accountId;
        return v.owner?.accountId === accountFilter;
    };

    const matchesGarage = (v: Vehicle) => {
        if (!garageFilter || garageFilter === 'all') return true;
        if (garageFilter === 'no_garage_assigned') return !v.assignedGarageId;
        return v.assignedGarageId === garageFilter;
    };

    const matchesGroup = (v: Vehicle) => {
        if (!groupFilter || groupFilter === 'all') return true;
        if (groupFilter === 'no_group_assigned') return !v.assignedGroupId;
        return v.assignedGroupId === groupFilter;
    };

    // ✅ Match Department
    const matchesDepartment = (v: Vehicle) => {
      if (!departmentFilter || departmentFilter === 'all') return true;
      if (departmentFilter === 'no_department_assigned') return !v.assignedDepartmentId;
      return v.assignedDepartmentId === departmentFilter;
    };

    const matchesOwner = (v: Vehicle) => {
        if (!ownerFilter || ownerFilter === 'all') return true;
        if (ownerFilter === 'AIE Skyline (Default)') return v.owner?.name === 'AIE Skyline' || v.owner?.isDefault;
        return v.owner?.name === ownerFilter;
    };

    const matchesAge = (v: Vehicle) => {
        if (!ageFilter || ageFilter === 'all') return true;
        if (!v.firstRegistrationDate) return false;
        
        const d = new Date(v.firstRegistrationDate);
        if (isNaN(d.getTime())) return false;
        
        const age = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));

        switch (ageFilter) {
            case '0-5': return age >= 0 && age <= 5;
            case '6-10': return age >= 6 && age <= 10;
            case '11-20': return age >= 11 && age <= 20;
            case '21-40': return age >= 21 && age <= 40;
            case '41+': return age > 40;
            default: return true;
        }
    };

    const matchesType = (v: Vehicle) => {
        if (!typeFilter || typeFilter === 'all') return true;
        if (typeFilter === 'unassigned') return !v.assignmentType;
        return v.assignmentType === typeFilter;
    };

    return vehicles.filter(v => {
      if (showSold) {
        return normalize(v.status) === 'sold' && matchesSearch(v) && matchesAccount(v) && matchesGarage(v) && matchesType(v) && matchesAge(v) && matchesGroup(v) && matchesDepartment(v) && matchesOwner(v);
      }
      return (
        normalize(v.status) !== 'sold' && 
        matchesSearch(v) && 
        matchesStatus(v) && 
        matchesMake(v) &&
        matchesExpiryFilter(v) &&
        matchesAccount(v) &&
        matchesGarage(v) &&
        matchesType(v) &&
        matchesAge(v) &&
        matchesGroup(v) && 
        matchesDepartment(v) && // ✅ Added
        matchesOwner(v)    
      );
    });
  }, [vehicles, searchQuery, statusFilter, makeFilter, showSold, expiryFilter, accountFilter, garageFilter, typeFilter, ageFilter, groupFilter, departmentFilter, ownerFilter]);

  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    makeFilter, setMakeFilter,
    showSold, setShowSold,
    filteredVehicles,
    uniqueMakes, uniqueOwners, 
    expiryFilter, setExpiryFilter,
    accountFilter, setAccountFilter,
    garageFilter, setGarageFilter,
    groupFilter, setGroupFilter, 
    departmentFilter, setDepartmentFilter, // ✅ Exported
    ownerFilter, setOwnerFilter, 
    typeFilter, setTypeFilter, 
    ageFilter, setAgeFilter, 
  };
}