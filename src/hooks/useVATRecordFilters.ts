// src/hooks/useVATRecordFilters.ts
import { useState, useMemo } from 'react';
import { VATRecord } from '../types/vatRecord';
import { isWithinInterval } from 'date-fns';

export const useVATRecordFilters = (records: VATRecord[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'awaiting' | 'processing' | 'paid'>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [amountRange, setAmountRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        rec.receiptNo.toLowerCase().includes(q) ||
        rec.supplier.toLowerCase().includes(q) ||
        rec.customerName.toLowerCase().includes(q) ||
        (rec.vatNo && rec.vatNo.toLowerCase().includes(q)); // Include vatNo in search

      if (!matchesSearch) return false;

      // Status
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;

      // Date
      if (dateRange.start && dateRange.end) {
        if (
          !isWithinInterval(rec.date, {
            start: dateRange.start,
            end: dateRange.end,
          })
        ) {
          return false;
        }
      }

      // Gross amount
      const gross = rec.gross ?? 0;
      if (amountRange.min != null && gross < amountRange.min) return false;
      if (amountRange.max != null && gross > amountRange.max) return false;

      return true;
    });
  }, [records, searchQuery, statusFilter, dateRange, amountRange]);

  // Summary (optional)
  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (acc, r) => {
        acc.net += r.net;
        acc.vat += r.vat;
        acc.gross += r.gross;
        acc.vatReceived += r.vatReceived ?? 0;
        return acc;
      },
      { net: 0, vat: 0, gross: 0, vatReceived: 0 }
    );
  }, [filteredRecords]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateRange,
    setDateRange,
    amountRange,
    setAmountRange,
    filteredRecords,
    summary,
  };
};