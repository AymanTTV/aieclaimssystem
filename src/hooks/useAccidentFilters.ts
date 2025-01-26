import { useState, useMemo } from 'react';
import { Accident } from '../types';

export const useAccidentFilters = (accidents: Accident[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [claimStatusFilter, setClaimStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  const filteredAccidents = useMemo(() => {
    return accidents.filter(accident => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        accident.referenceNo?.toString().includes(searchLower) ||
        accident.referenceName?.toLowerCase().includes(searchLower) ||
        accident.driverName.toLowerCase().includes(searchLower) ||
        accident.vehicleVRN.toLowerCase().includes(searchLower) ||
        accident.accidentLocation.toLowerCase().includes(searchLower) ||
        accident.description.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || accident.status === statusFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || accident.type === typeFilter;

      // Claim status filter
      const matchesClaimStatus = claimStatusFilter === 'all' || accident.claimStatus === claimStatusFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRange.start && dateRange.end) {
        const accidentDate = new Date(accident.accidentDate);
        matchesDateRange = accidentDate >= dateRange.start && accidentDate <= dateRange.end;
      }

      return matchesSearch && 
             matchesStatus && 
             matchesType && 
             matchesClaimStatus && 
             matchesDateRange;
    });
  }, [accidents, searchQuery, statusFilter, typeFilter, claimStatusFilter, dateRange]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    claimStatusFilter,
    setClaimStatusFilter,
    dateRange,
    setDateRange,
    filteredAccidents
  };
};

export default useAccidentFilters;
