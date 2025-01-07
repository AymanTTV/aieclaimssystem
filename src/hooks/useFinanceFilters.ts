import { useState, useMemo } from 'react';
import { Transaction, Vehicle } from '../types';
import { isWithinInterval } from 'date-fns';

export const useFinanceFilters = (transactions: Transaction[] = [], vehicles: Vehicle[] = []) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [category, setCategory] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partially_paid'>('all');
  const [owner, setOwner] = useState('all');

  // Get unique owners from vehicles
  const uniqueOwners = useMemo(() => {
    const owners = vehicles
      .filter(v => !v.owner?.isDefault)
      .map(v => v.owner?.name)
      .filter((name): name is string => !!name);
    return Array.from(new Set(owners));
  }, [vehicles]);

  // Filter logic (with debugging)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower);

      // Apply date range filter
      let matchesDateRange = true;
      if (startDate && endDate) {
        matchesDateRange = isWithinInterval(transaction.date, { start: startDate, end: endDate });
      }

      // Type filter
      const matchesType = type === 'all' || transaction.type === type;

      // Category filter
      const matchesCategory = category === 'all' || 
        transaction.category.toLowerCase() === category.toLowerCase();

      // Payment status filter
      const matchesPaymentStatus = paymentStatus === 'all' || 
        transaction.paymentStatus === paymentStatus;

      // Owner filter
      let matchesOwner = true;
      if (owner !== 'all') {
        const vehicle = vehicles.find(v => v.id === transaction.vehicleId);
        matchesOwner = owner === 'company' ? !vehicle || vehicle.owner?.isDefault : vehicle?.owner?.name === owner;
      }

      // Combine all filters
      return (
        matchesSearch &&
        matchesDateRange &&
        matchesType &&
        matchesCategory &&
        matchesPaymentStatus &&
        matchesOwner
      );
    });
  }, [transactions, searchQuery, startDate, endDate, type, category, paymentStatus, owner, vehicles]);

  // Debugging: Log current filter values
  console.log({
    searchQuery,
    startDate,
    endDate,
    type,
    category,
    paymentStatus,
    owner
  });

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
    paymentStatus,
    setPaymentStatus,
    owner,
    setOwner,
    uniqueOwners,
    filteredTransactions
  };
};
