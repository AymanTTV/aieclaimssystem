import { useState, useMemo } from 'react';
import { PettyCashTransaction } from '../types/pettyCash';
import { isWithinInterval } from 'date-fns';

export const usePettyCashFilters = (transactions: PettyCashTransaction[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });
  const [statusFilter, setStatusFilter] = useState('all');
  const [amountRange, setAmountRange] = useState<{
    min: number | null;
    max: number | null;
  }>({ min: null, max: null });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        transaction.name.toLowerCase().includes(searchLower) ||
        transaction.telephone.includes(searchLower) ||
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.note?.toLowerCase().includes(searchLower) ||
        transaction.amountIn.toString().includes(searchLower) ||
        transaction.amountOut.toString().includes(searchLower) ||
        transaction.status.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRange.start && dateRange.end) {
        matchesDateRange = isWithinInterval(transaction.date, {
          start: dateRange.start,
          end: dateRange.end
        });
      }

      // Amount range filter
      let matchesAmountRange = true;
      if (amountRange.min !== null || amountRange.max !== null) {
        const amount = transaction.amountIn || transaction.amountOut;
        if (amountRange.min !== null && amount < amountRange.min) {
          matchesAmountRange = false;
        }
        if (amountRange.max !== null && amount > amountRange.max) {
          matchesAmountRange = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDateRange && matchesAmountRange;
    });
  }, [transactions, searchQuery, statusFilter, dateRange, amountRange]);

  return {
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange,
    statusFilter,
    setStatusFilter,
    amountRange,
    setAmountRange,
    filteredTransactions
  };
};