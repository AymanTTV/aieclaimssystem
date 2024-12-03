import { useState } from 'react';
import { Transaction } from '../types';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export const useFinanceFilters = (transactions: Transaction[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');

  const filterByPeriod = (transaction: Transaction) => {
    const now = new Date();
    switch (period) {
      case 'week':
        return transaction.date >= startOfWeek(now) && transaction.date <= endOfWeek(now);
      case 'month':
        return transaction.date >= startOfMonth(now) && transaction.date <= endOfMonth(now);
      case 'year':
        return transaction.date >= startOfYear(now) && transaction.date <= endOfYear(now);
      default:
        return true;
    }
  };

  const filterBySearch = (transaction: Transaction) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.category.toLowerCase().includes(searchLower)
    );
  };

  const filterByType = (transaction: Transaction) => {
    return type === 'all' ? true : transaction.type === type;
  };

  const filteredTransactions = transactions
    .filter(filterByPeriod)
    .filter(filterBySearch)
    .filter(filterByType);

  return {
    searchTerm,
    setSearchTerm,
    period,
    setPeriod,
    type,
    setType,
    filteredTransactions
  };
};