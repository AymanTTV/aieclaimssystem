// src/hooks/useVATRecordFilters.ts

import { useState, useMemo } from 'react';
import { VATRecord } from '../types/vatRecord';
import { isWithinInterval } from 'date-fns';

export const useVATRecordFilters = (records: VATRecord[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        record.receiptNo.toLowerCase().includes(searchLower) ||
        record.supplier.toLowerCase().includes(searchLower) ||
        record.customerName.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRange.start && dateRange.end) {
        matchesDateRange = isWithinInterval(record.date, {
          start: dateRange.start,
          end: dateRange.end
        });
      }

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [records, searchQuery, statusFilter, dateRange]);

  // Calculate summary totals
  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (acc, record) => ({
        gross: acc.gross + record.gross,
        vat: acc.vat + record.vat,
        net: acc.net + record.net,
        vatReceived: acc.vatReceived + (record.vatReceived || 0) // Ensure vatReceived is accounted for
      }),
      { gross: 0, vat: 0, net: 0, vatReceived: 0 }
    );
  }, [filteredRecords]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    filteredRecords,
    summary
  };
};