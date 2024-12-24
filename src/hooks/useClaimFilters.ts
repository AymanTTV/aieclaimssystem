import { useState, useMemo } from 'react';
import { Claim } from '../types';
import { isWithinInterval } from 'date-fns';

export const useClaimFilters = (claims: Claim[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [submitterFilter, setSubmitterFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  const filteredClaims = useMemo(() => {
    return claims.filter(claim => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        claim.claimDetails.driverName.toLowerCase().includes(searchLower) ||
        claim.claimDetails.vehicleVRN.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || claim.claimType === typeFilter;

      // Submitter filter
      const matchesSubmitter = submitterFilter === 'all' || claim.submitterType === submitterFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRange.start && dateRange.end) {
        matchesDateRange = isWithinInterval(claim.createdAt, {
          start: dateRange.start,
          end: dateRange.end
        });
      }

      return matchesSearch && matchesStatus && matchesType && matchesSubmitter && matchesDateRange;
    });
  }, [claims, searchQuery, statusFilter, typeFilter, submitterFilter, dateRange]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    submitterFilter,
    setSubmitterFilter,
    dateRange,
    setDateRange,
    filteredClaims
  };
};