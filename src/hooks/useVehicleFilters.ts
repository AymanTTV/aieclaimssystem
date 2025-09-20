// src/hooks/useVehicleFilters.ts
import { useMemo, useState } from 'react';
import { Vehicle } from '../types';

const norm = (v: unknown) => String(v ?? '').toLowerCase().trim();

export const useVehicleFilters = (vehicles: Vehicle[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Vehicle['status']>('all');
  const [makeFilter, setMakeFilter] = useState<string>('all');
  const [showSold, setShowSold] = useState<boolean>(false);

  const filteredVehicles = useMemo(() => {
    const q = norm(searchQuery);

    return (vehicles || []).filter((v) => {
      // 1) Sold toggle: hide sold unless explicitly shown
      if (!showSold && norm(v?.status) === 'sold') return false;

      // 2) Status filter (when not "all")
      if (statusFilter !== 'all' && norm(v?.status) !== norm(statusFilter)) return false;

      // 3) Make filter (when not "all")
      if (makeFilter !== 'all' && norm(v?.make) !== norm(makeFilter)) return false;

      // 4) Search (null-safe across common fields)
      if (!q) return true;
      const haystack = [
        v?.registrationNumber, // <--- CORRECTED THIS LINE
        v?.make,
        v?.model,
        v?.vin,
        (v as any)?.colour,
        (v as any)?.engineNumber,
        (v as any)?.ownerName,
      ]
        .map(norm)
        .join(' ');
      return haystack.includes(q);
    });
  }, [vehicles, searchQuery, statusFilter, makeFilter, showSold]);

  const uniqueMakes = useMemo(() => {
    const s = new Set<string>();
    for (const v of vehicles || []) {
      const mk = (v?.make ?? '').toString().trim();
      if (mk) s.add(mk);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [vehicles]);

  return {
    // state
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    makeFilter,
    setMakeFilter,
    showSold,
    setShowSold,
    // derived
    filteredVehicles,
    uniqueMakes,
  };
};