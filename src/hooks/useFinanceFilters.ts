// src/hooks/useFinanceFilters.ts

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
  const [vehicleRegistration, setVehicleRegistration] = useState('');

  // Get unique owners from vehicles
  const uniqueOwners = useMemo(() => {
    const owners = vehicles
      .filter(v => !v.owner?.isDefault)
      .map(v => v.owner?.name)
      .filter((name): name is string => !!name);
    return Array.from(new Set(owners));
  }, [vehicles]);

  // Get all vehicles for a specific owner
  const getOwnerVehicles = (ownerName: string) => {
    return vehicles.filter(v => 
      ownerName === 'company' 
        ? v.owner?.isDefault 
        : v.owner?.name === ownerName
    ).map(v => v.id);
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const searchLower = searchQuery.toLowerCase();
      const vehicle = vehicles.find(v => v.id === transaction.vehicleId);

      // Search filter
      const matchesSearch =
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower) ||
        (vehicle?.registrationNumber?.toLowerCase().includes(searchLower) || false) ||
        (transaction.paymentReference?.toLowerCase().includes(searchLower) || false) ||
        (transaction.vehicleName?.toLowerCase().includes(searchLower) || false);

      // Date range filter
      let matchesDateRange = true;
      if (startDate && endDate) {
        matchesDateRange = isWithinInterval(transaction.date, { start: startDate, end: endDate });
      }

      // Type filter
      const matchesType = type === 'all' || transaction.type === type;

      // Category filter
      const matchesCategory = category === 'all' || transaction.category.toLowerCase() === category.toLowerCase();

      // Payment status filter
      const matchesPaymentStatus = paymentStatus === 'all' || transaction.paymentStatus === paymentStatus;

      // Owner filter
      let matchesOwner = true;
      if (owner !== 'all') {
        const ownerVehicles = getOwnerVehicles(owner);
        matchesOwner = transaction.vehicleId ? ownerVehicles.includes(transaction.vehicleId) : false;
      }

      return matchesSearch && 
             matchesDateRange && 
             matchesType && 
             matchesCategory && 
             matchesPaymentStatus && 
             matchesOwner;
    });
  }, [transactions, vehicles, searchQuery, startDate, endDate, type, category, paymentStatus, owner]);

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
    vehicleRegistration,
    setVehicleRegistration,
    filteredTransactions,
  };
};
