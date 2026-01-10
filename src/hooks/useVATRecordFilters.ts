// src/hooks/useVATRecordFilters.ts
import { useState, useMemo } from 'react';
import { VATRecord } from '../types/vatRecord';
import { isWithinInterval } from 'date-fns';

export const useVATRecordFilters = (records: VATRecord[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryIdFilter, setCategoryIdFilter] = useState<string>('all');
  const [groupIdFilter, setGroupIdFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'awaiting' | 'processing' | 'paid'>('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [amountRange, setAmountRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });

  // --- RECURRING FILTERS ---
  const [recurringFilter, setRecurringFilter] = useState<string>('all');
  const [recurringFrequency, setRecurringFrequency] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState(''); // Keep existing due date specific filter logic separate if needed, or merge.
  // -------------------------

  const filteredRecords = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();

    return records.filter((rec) => {
      // --- Search (guards) ---
      const receiptNo = (rec.receiptNo ?? '').toLowerCase();
      const accountant = (rec.accountant ?? '').toLowerCase(); 
      const supplier  = (rec.supplier ?? '').toLowerCase();
      const customer  = (rec.customerName ?? '').toLowerCase();
      const regNo     = (rec.regNo ?? '').toLowerCase();
      const vatNo     = (rec.vatNo ?? '').toLowerCase();

      const matchesSearch =
        (!q) ||
        receiptNo.includes(q) ||
        accountant.includes(q) ||
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

      // --- Date Range Logic (Date OR Due Date) ---
      if (dateRange.start && dateRange.end) {
        const interval = { start: dateRange.start, end: dateRange.end };
        const dateInRange = isWithinInterval(rec.date, interval);
        // Check due date if it exists
        const dueDateInRange = rec.dueDate ? isWithinInterval(rec.dueDate, interval) : false;
        
        if (!dateInRange && !dueDateInRange) return false;
        
      } else if (dateRange.start) {
        const dateAfter = rec.date >= dateRange.start;
        const dueDateAfter = rec.dueDate ? rec.dueDate >= dateRange.start : false;
        if (!dateAfter && !dueDateAfter) return false;

      } else if (dateRange.end) {
        const dateBefore = rec.date <= dateRange.end;
        const dueDateBefore = rec.dueDate ? rec.dueDate <= dateRange.end : false;
        if (!dateBefore && !dueDateBefore) return false;
      }

      // --- Gross amount ---
      const gross = rec.gross ?? 0;
      if (amountRange.min != null && gross < amountRange.min) return false;
      if (amountRange.max != null && gross > amountRange.max) return false;

      // --- RECURRING LOGIC ---
      let matchesRecurring = true;
      if (recurringFilter === 'all') matchesRecurring = true;
      else if (recurringFilter === 'non_recurring') matchesRecurring = !rec.isRecurring;
      else if (recurringFilter === 'active_recurring') matchesRecurring = !!rec.isRecurring && !!rec.nextRecurringDate;
      else if (recurringFilter === 'recurring_history') matchesRecurring = !!rec.isRecurring && !rec.nextRecurringDate;

      let matchesFrequency = true;
      if (recurringFrequency !== 'all') {
          if (rec.isRecurring) matchesFrequency = rec.recurringFrequency === recurringFrequency;
          else matchesFrequency = false;
      }

      return matchesRecurring && matchesFrequency;
    });
  }, [
    records, searchQuery, statusFilter, dateRange, amountRange, categoryIdFilter, groupIdFilter, 
    recurringFilter, recurringFrequency // Deps
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
    groupIdFilter, setGroupIdFilter,
    dueDateFilter, setDueDateFilter, // Keep specific due date filter
    summary,
    recurringFilter, setRecurringFilter,           
    recurringFrequency, setRecurringFrequency      
  };
};