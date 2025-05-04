import { useState, useMemo } from 'react';
import { Transaction, Vehicle, Account } from '../types';
import { isWithinInterval } from 'date-fns';

export const useFinanceFilters = (transactions: Transaction[] = [], vehicles: Vehicle[] = [], accounts: Account[] = []) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [category, setCategory] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partially_paid'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [accountFromFilter, setAccountFromFilter] = useState('all');
  const [accountToFilter, setAccountToFilter] = useState('all');

  const owners = useMemo(() => {
    const ownerSet = new Set<string>();
    vehicles.forEach(vehicle => {
      if (vehicle.owner && !vehicle.owner.isDefault) {
        ownerSet.add(vehicle.owner.name);
      }
    });
    return Array.from(ownerSet);
  }, [vehicles]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const vehicle = vehicles.find(v => v.id === transaction.vehicleId);

      const matchesSearch =
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower) ||
        transaction.paymentReference?.toLowerCase().includes(searchLower) ||
        transaction.customerName?.toLowerCase().includes(searchLower) ||
        transaction.vehicleName?.toLowerCase().includes(searchLower) ||
        vehicle?.registrationNumber?.toLowerCase().includes(searchLower) ||
        false;

      // Type filter
      const matchesType = type === 'all' || transaction.type === type;

      // Category filter
      const matchesCategory = category === 'all' || transaction.category.toLowerCase() === category.toLowerCase();

      // Payment status filter
      const matchesPaymentStatus = paymentStatus === 'all' || transaction.paymentStatus === paymentStatus;

      // Customer filter
      const matchesCustomer = !selectedCustomerId || transaction.customerId === selectedCustomerId;

      // Account filter - match if transaction involves the selected account (from OR to)
      const matchesAccount = accountFilter === 'all' || 
                           transaction.accountFrom === accountFilter || 
                           transaction.accountTo === accountFilter;
                           
      // Account From filter
      const matchesAccountFrom = accountFromFilter === 'all' || transaction.accountFrom === accountFromFilter;
      
      // Account To filter
      const matchesAccountTo = accountToFilter === 'all' || transaction.accountTo === accountToFilter;

      // Owner filter
      const matchesOwner = selectedOwner === 'all' ||
        (selectedOwner === 'company' && (!transaction.vehicleOwner || transaction.vehicleOwner.isDefault)) ||
        (transaction.vehicleOwner && transaction.vehicleOwner.name === selectedOwner);

      // Date range filter
      let matchesDateRange = true;
      if (startDate && endDate) {
        matchesDateRange = isWithinInterval(transaction.date, { start: startDate, end: endDate });
      }

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesPaymentStatus &&
        matchesCustomer &&
        matchesOwner &&
        matchesAccount &&
        matchesAccountFrom &&
        matchesAccountTo &&
        matchesDateRange
      );
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [
    transactions,
    searchQuery,
    type,
    category,
    paymentStatus,
    selectedCustomerId,
    selectedOwner,
    accountFilter,
    accountFromFilter,
    accountToFilter,
    startDate,
    endDate,
    vehicles
  ]);

  // Calculate account summary for the selected account
  const accountSummary = useMemo(() => {
    if (accountFilter === 'all') return null;
    
    const income = filteredTransactions
      .filter(t => t.type === 'income' && t.accountTo === accountFilter)
      .reduce((sum, t) => sum + t.amount, 0);
      
    const expense = filteredTransactions
      .filter(t => t.type === 'expense' && t.accountFrom === accountFilter)
      .reduce((sum, t) => sum + t.amount, 0);
      
    return { income, expense, balance: income - expense };
  }, [filteredTransactions, accountFilter]);

  const setDateRange = (range: { start: Date | null; end: Date | null }) => {
    setStartDate(range.start);
    setEndDate(range.end);
  };

  return {
    searchQuery,
    setSearchQuery,
    type,
    setType,
    category,
    setCategory,
    paymentStatus,
    setPaymentStatus,
    dateRange: { start: startDate, end: endDate },
    setDateRange,
    selectedCustomerId,
    setSelectedCustomerId,
    selectedOwner,
    setSelectedOwner,
    accountFilter,
    setAccountFilter,
    accountFromFilter,
    setAccountFromFilter,
    accountToFilter,
    setAccountToFilter,
    owners,
    filteredTransactions,
    accountSummary
  };
};