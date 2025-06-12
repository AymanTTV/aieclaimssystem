import { useState, useMemo } from 'react';
import { IncomeExpenseEntry } from '../types/incomeExpense';

export function useIncomeExpenseFilters(entries: IncomeExpenseEntry[]) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [progress, setProgress] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const customer = e.customer?.toLowerCase?.() || '';
      const reference = e.reference?.toLowerCase?.() || '';
      const searchText = search.toLowerCase();

      const matchesSearch =
        customer.includes(searchText) ||
        reference.includes(searchText);

      const matchesType =
        typeFilter === 'all' || e.type === typeFilter;

      const matchesProgress =
        progress === 'all' || e.progress === progress;

      const matchesDate =
        dateRange.start && dateRange.end
          ? new Date(e.date) >= new Date(dateRange.start) &&
            new Date(e.date) <= new Date(dateRange.end)
          : true;

      return matchesSearch && matchesType && matchesProgress && matchesDate;
    });
  }, [entries, search, typeFilter, progress, dateRange]);

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    progress,
    setProgress,
    dateRange,
    setDateRange,
    filteredEntries
  };
}
