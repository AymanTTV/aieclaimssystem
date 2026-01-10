// src/hooks/useIncomeExpenseFilters.ts
import { useMemo, useState } from 'react';
import { IncomeExpenseEntry } from '../types/incomeExpense';
import { startOfDay, endOfDay } from 'date-fns';

export function useIncomeExpenseFilters(entries: IncomeExpenseEntry[]) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [progress, setProgress] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [category, setCategory] = useState('all');

  // Note: date inputs are usually "YYYY-MM-DD"
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  // --- RECURRING FILTERS ---
  const [recurringFilter, setRecurringFilter] = useState<'all' | 'recurring' | 'non_recurring'>('all');
  const [recurringFrequency, setRecurringFrequency] = useState<string>('all');
  // ------------------------

  const filteredEntries = useMemo(() => {
    const searchText = (search || '').trim().toLowerCase();

    // Inclusive date range:
    // - start -> startOfDay(start)
    // - end   -> endOfDay(end)  ✅ makes "To" include the full day
    const start =
      dateRange.start && dateRange.start.trim()
        ? startOfDay(new Date(dateRange.start))
        : null;

    const end =
      dateRange.end && dateRange.end.trim()
        ? endOfDay(new Date(dateRange.end))
        : null;

    return entries.filter((e) => {
      // --- Search ---
      const customer = (e.customer || '').toString().toLowerCase();
      const reference = (e.reference || '').toString().toLowerCase();

      const matchesSearch =
        !searchText ||
        customer.includes(searchText) ||
        reference.includes(searchText);

      // --- Type ---
      const matchesType = typeFilter === 'all' || e.type === typeFilter;

      // --- Progress ---
      const matchesProgress = progress === 'all' || e.progress === progress;

      // --- Category ---
      const matchesCategory = category === 'all' || e.category === category;

      // --- Date (inclusive + supports only-start or only-end) ---
      const entryDate = e.date ? new Date(e.date) : null;

      const matchesDate =
        !entryDate
          ? true
          : start && end
          ? entryDate >= start && entryDate <= end
          : start
          ? entryDate >= start
          : end
          ? entryDate <= end
          : true;

      // --- Recurring ---
      const matchesRecurring =
        recurringFilter === 'all' ||
        (recurringFilter === 'recurring' && !!e.isRecurring) ||
        (recurringFilter === 'non_recurring' && !e.isRecurring);

      // --- Frequency (only applies when recurring is true) ---
      const matchesFrequency =
        recurringFrequency === 'all' ||
        (!!e.isRecurring && e.recurringFrequency === recurringFrequency);

      return (
        matchesSearch &&
        matchesType &&
        matchesProgress &&
        matchesCategory &&
        matchesDate &&
        matchesRecurring &&
        matchesFrequency
      );
    });
  }, [
    entries,
    search,
    typeFilter,
    progress,
    category,
    dateRange.start,
    dateRange.end,
    recurringFilter,
    recurringFrequency,
  ]);

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    progress,
    setProgress,
    category,
    setCategory,
    dateRange,
    setDateRange,
    recurringFilter,
    setRecurringFilter,
    recurringFrequency,
    setRecurringFrequency,
    filteredEntries,
  };
}
