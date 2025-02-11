// src/hooks/useDriverPayFilters.ts

import { useState, useMemo } from 'react';
import { DriverPay } from '../types/driverPay';
import { isWithinInterval } from 'date-fns';

export const useDriverPayFilters = (records: DriverPay[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        record.driverNo.toLowerCase().includes(searchLower) ||
        record.tidNo.toString().includes(searchLower) ||
        record.name.toLowerCase().includes(searchLower) ||
        record.phoneNumber.includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

      // Collection filter
      const matchesCollection = collectionFilter === 'all' || record.collection === collectionFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRange.start && dateRange.end) {
        matchesDateRange = isWithinInterval(record.startDate, {
          start: dateRange.start,
          end: dateRange.end
        });
      }

      return matchesSearch && matchesStatus && matchesCollection && matchesDateRange;
    });
  }, [records, searchQuery, statusFilter, collectionFilter, dateRange]);

  // Calculate summary totals
  const summary = useMemo(() => {
    return filteredRecords.reduce((acc, record) => ({
      total: acc.total + record.totalAmount,
      commission: acc.commission + record.commissionAmount,
      netPay: acc.netPay + record.netPay
    }), {
      total: 0,
      commission: 0,
      netPay: 0
    });
  }, [filteredRecords]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    collectionFilter,
    setCollectionFilter,
    dateRange,
    setDateRange,
    filteredRecords,
    summary
  };
};
