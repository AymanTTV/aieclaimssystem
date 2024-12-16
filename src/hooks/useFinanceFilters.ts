import { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export const useFinanceFilters = (transactions: Transaction[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [category, setCategory] = useState('all');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower);

      // Date range filter
      let matchesDateRange = true;
      if (startDate && endDate) {
        matchesDateRange = isWithinInterval(transaction.date, {
          start: startOfDay(startDate),
          end: endOfDay(endDate)
        });
      } else if (startDate) {
        matchesDateRange = transaction.date >= startOfDay(startDate);
      } else if (endDate) {
        matchesDateRange = transaction.date <= endOfDay(endDate);
      }

      // Type filter
      const matchesType = type === 'all' || transaction.type === type;

      // Category filter
      const matchesCategory = category === 'all' || 
        transaction.category.toLowerCase() === category.toLowerCase();

      return matchesSearch && matchesDateRange && matchesType && matchesCategory;
    });
  }, [transactions, searchQuery, startDate, endDate, type, category]);

  return {
    searchQuery,
    setSearchQuery,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    type,
    setType,
    category,
    setCategory,
    filteredTransactions
  };
};