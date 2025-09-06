// src/hooks/useVATRecordFilters.ts
import { useState, useMemo } from 'react';
import { VATRecord } from '../types/vatRecord';
import { isWithinInterval } from 'date-fns';

export const useVATRecordFilters = (records: VATRecord[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryIdFilter, setCategoryIdFilter] = useState<string>('all');
  const [groupIdFilter, setGroupIdFilter] = useState<string>('all'); // NEW
  const [statusFilter, setStatusFilter] =
    useState<'all' | 'awaiting' | 'processing' | 'paid'>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [amountRange, setAmountRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  });

  const filteredRecords = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();

    return records.filter((rec) => {
      // --- Search (guards) ---
      const receiptNo = (rec.receiptNo ?? '').toLowerCase();
      const supplier  = (rec.supplier ?? '').toLowerCase();
      const customer  = (rec.customerName ?? '').toLowerCase();
      const regNo     = (rec.regNo ?? '').toLowerCase();
      const vatNo     = (rec.vatNo ?? '').toLowerCase();

      const matchesSearch =
        (!q) ||
        receiptNo.includes(q) ||
        supplier.includes(q) ||
        customer.includes(q) ||
        regNo.includes(q) ||
        vatNo.includes(q);

      if (!matchesSearch) return false;

      // --- Status ---
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;

      // --- Category & Group ---
      if (categoryIdFilter !== 'all' && rec.categoryId !== categoryIdFilter) return false;
      if (groupIdFilter !== 'all' && rec.groupId !== groupIdFilter) return false;

      // --- Date (support start-only / end-only / both) ---
      if (dateRange.start && dateRange.end) {
        if (
          !isWithinInterval(rec.date, {
            start: dateRange.start,
            end: dateRange.end,
          })
        ) return false;
      } else if (dateRange.start && rec.date < dateRange.start) {
        return false;
      } else if (dateRange.end && rec.date > dateRange.end) {
        return false;
      }

      // --- Gross amount ---
      const gross = rec.gross ?? 0;
      if (amountRange.min != null && gross < amountRange.min) return false;
      if (amountRange.max != null && gross > amountRange.max) return false;

      return true;
    });
  }, [
    records,
    searchQuery,
    statusFilter,
    dateRange.start,
    dateRange.end,
    amountRange.min,
    amountRange.max,
    categoryIdFilter,
    groupIdFilter, // NEW
  ]);

  const summary = useMemo(() => {
    return filteredRecords.reduce(
      (acc, r) => {
        acc.net += r.net || 0;
        acc.vat += r.vat || 0;
        acc.gross += r.gross || 0;
        acc.vatReceived += r.vatReceived ?? 0;
        return acc;
      },
      { net: 0, vat: 0, gross: 0, vatReceived: 0 }
    );
  }, [filteredRecords]);

  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    dateRange, setDateRange,
    amountRange, setAmountRange,
    filteredRecords,
    categoryIdFilter, setCategoryIdFilter,
    groupIdFilter, setGroupIdFilter, // NEW
    summary,
  };
};
