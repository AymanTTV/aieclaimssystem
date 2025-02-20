// src/hooks/useDriverPayFilters.ts

import { useState, useMemo } from 'react';
import { DriverPay } from '../types/driverPay';
import { startOfDay, endOfDay } from 'date-fns';

export const useDriverPayFilters = (records: DriverPay[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collectionFilter, setCollectionFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        record.driverNo?.toLowerCase().includes(searchLower) ||
        record.tidNo?.toString().includes(searchLower) ||
        record.name?.toLowerCase().includes(searchLower) ||
        record.phoneNumber?.includes(searchLower);

      // Collection filter
      const matchesCollection = collectionFilter === 'all' || record.collection === collectionFilter;

      // Create a copy of the record with filtered payment periods
      const filteredPeriods = record.paymentPeriods.filter(period => {
        const matchesStatus = statusFilter === 'all' || period.status === statusFilter;

        let matchesDateRange = true;
        if (dateRange.start && dateRange.end) {
          // Convert period dates to Date objects
          const periodStartDate = period.startDate instanceof Date ? 
            period.startDate : 
            period.startDate.toDate();
            
          const periodEndDate = period.endDate instanceof Date ? 
            period.endDate : 
            period.endDate.toDate();

          // Convert to start/end of day for comparison
          const periodStart = startOfDay(periodStartDate);
          const periodEnd = startOfDay(periodEndDate);
          const filterStart = startOfDay(dateRange.start);
          const filterEnd = startOfDay(dateRange.end);

          // Check if period dates match the filter dates
          matchesDateRange = 
            periodStart.getTime() === filterStart.getTime() &&
            periodEnd.getTime() === filterEnd.getTime();
        }

        return matchesStatus && matchesDateRange;
      });

      // Only include records with matching periods
      if (filteredPeriods.length === 0) {
        return false;
      }

      // Return a new record object with only the matching periods
      return matchesSearch && matchesCollection;
    }).map(record => ({
      ...record,
      paymentPeriods: record.paymentPeriods.filter(period => {
        const matchesStatus = statusFilter === 'all' || period.status === statusFilter;

        let matchesDateRange = true;
        if (dateRange.start && dateRange.end) {
          const periodStartDate = period.startDate instanceof Date ? 
            period.startDate : 
            period.startDate.toDate();
            
          const periodEndDate = period.endDate instanceof Date ? 
            period.endDate : 
            period.endDate.toDate();

          const periodStart = startOfDay(periodStartDate);
          const periodEnd = startOfDay(periodEndDate);
          const filterStart = startOfDay(dateRange.start);
          const filterEnd = startOfDay(dateRange.end);

          matchesDateRange = 
            periodStart.getTime() === filterStart.getTime() &&
            periodEnd.getTime() === filterEnd.getTime();
        }

        return matchesStatus && matchesDateRange;
      })
    }));
  }, [records, searchQuery, statusFilter, collectionFilter, dateRange]);

  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (acc, record) => {
        record.paymentPeriods.forEach(period => {
          const totalAmount = Number(period.totalAmount) || 0;
          const commissionAmount = (Number(period.commissionPercentage) / 100) * totalAmount || 0;
          const netPay = totalAmount - commissionAmount;

          acc.total += totalAmount;
          acc.commission += commissionAmount;
          acc.netPay += netPay;
        });
        return acc;
      },
      { total: 0, commission: 0, netPay: 0 }
    );
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
    summary,
  };
};
