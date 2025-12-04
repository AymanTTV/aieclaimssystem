// src/hooks/useIncomeExpenseFilters.ts
import { useState, useMemo } from 'react';
import { IncomeExpenseEntry } from '../types/incomeExpense';

export function useIncomeExpenseFilters(entries: IncomeExpenseEntry[]) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [progress, setProgress] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [category, setCategory] = useState('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  
  // --- RECURRING FILTERS ---
  const [recurringFilter, setRecurringFilter] = useState<'all' | 'recurring' | 'non_recurring'>('all');
  const [recurringFrequency, setRecurringFrequency] = useState<string>('all'); // New Frequency Filter
  // ------------------------

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
      
      const matchesCategory = 
        category === 'all' || e.category === category;

      const matchesDate =
        dateRange.start && dateRange.end
          ? new Date(e.date) >= new Date(dateRange.start) &&
            new Date(e.date) <= new Date(dateRange.end)
          : true;

      // --- Recurring Logic ---
      const matchesRecurring = recurringFilter === 'all' || 
          (recurringFilter === 'recurring' && e.isRecurring) || 
          (recurringFilter === 'non_recurring' && !e.isRecurring);

      // --- Frequency Logic ---
      const matchesFrequency = recurringFrequency === 'all' || 
          (e.isRecurring && e.recurringFrequency === recurringFrequency);

      return matchesSearch && matchesType && matchesProgress && matchesCategory && matchesDate && matchesRecurring && matchesFrequency;
    });
  }, [entries, search, typeFilter, progress, category, dateRange, recurringFilter, recurringFrequency]);

  return {
    search, setSearch,
    typeFilter, setTypeFilter,
    progress, setProgress,
    category, setCategory,
    dateRange, setDateRange,
    recurringFilter, setRecurringFilter,
    recurringFrequency, setRecurringFrequency, // Export new setters
    filteredEntries
  };
}