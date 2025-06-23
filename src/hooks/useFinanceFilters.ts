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
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const owners = useMemo(() => {
    const ownerSet = new Set<string>();
    
    // Iterate through vehicles to gather owner names
    vehicles.forEach(vehicle => {
      if (vehicle.owner && vehicle.owner.name) {
        // Explicitly add "AIE Skyline Limited" if it's an owner
        if (vehicle.owner.name === 'AIE Skyline Limited') {
          ownerSet.add('AIE Skyline Limited');
        } 
        // Add other owner names, but explicitly exclude "AIE Skyline" (without Limited)
        else if (vehicle.owner.name !== 'AIE Skyline') {
          ownerSet.add(vehicle.owner.name);
        }
      }
    });
    // Sort and convert to array
    return Array.from(ownerSet).sort();
  }, [vehicles]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const searchLower = searchQuery.toLowerCase();
      const vehicle = vehicles.find(v => v.id === transaction.vehicleId);

      if (groupFilter !== 'all' && transaction.groupId !== groupFilter) {
        return false;
      }

      const matchesSearch =
        transaction.category.toLowerCase().includes(searchLower) ||
        transaction.paymentReference?.toLowerCase().includes(searchLower) ||
        transaction.vehicleName?.toLowerCase().includes(searchLower) ||
        vehicle?.registrationNumber?.toLowerCase().includes(searchLower) ||
        transaction.vehicleOwner?.name?.toLowerCase().includes(searchLower) ||
        false;

      const matchesType = type === 'all' || transaction.type === type;
      const matchesCategory = category === 'all' || transaction.category.toLowerCase() === category.toLowerCase();
      const matchesPaymentStatus = paymentStatus === 'all' || transaction.paymentStatus === paymentStatus;
      const matchesCustomer = !selectedCustomerId || transaction.customerId === selectedCustomerId;

      // Account filter - match if transaction involves the selected account (from OR to)
      const matchesAccount = accountFilter === 'all' ||
                           transaction.accountFrom === accountFilter ||
                           transaction.accountTo === accountFilter;

      let matchesOwner = false;
      if (selectedOwner === 'all') {
        matchesOwner = true; // 'All Owners' matches all transactions
      } else if (selectedOwner === 'AIE Skyline Limited') {
        // "AIE Skyline Limited" matches transactions explicitly assigned to it
        // OR transactions with no vehicleOwner (which are now considered "AIE Skyline Limited" by default)
        matchesOwner = (transaction.vehicleOwner && transaction.vehicleOwner.name === 'AIE Skyline Limited') ||
                       (!transaction.vehicleOwner);
      } else {
        // Match if transaction has a vehicle owner and their name matches the selected owner (excluding AIE Skyline Limited if it's not the selected owner)
        matchesOwner = (transaction.vehicleOwner && transaction.vehicleOwner.name === selectedOwner);
      }

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
        matchesOwner && // Use the updated matchesOwner logic
        matchesAccount &&
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
    selectedOwner, // Dependency for the updated logic
    accountFilter,
    startDate,
    endDate,
    groupFilter,
    vehicles
  ]);

  const totalOwingFromOwners = useMemo(() => {
    // Determine the relevant transactions for owing calculation based on selectedOwner
    const transactionsForOwingCalculation = transactions.filter(t => {
      const isAIESkylineLimitedDefault = !t.vehicleOwner; // Transactions with no vehicle owner are AIE Skyline Limited by default
      const isExplicitAIESkylineLimited = t.vehicleOwner && t.vehicleOwner.name === 'AIE Skyline Limited';

      if (selectedOwner === 'all') {
        // For 'all', consider all transactions that have an owner or are implicitly AIE Skyline Limited
        return t.vehicleOwner || isAIESkylineLimitedDefault;
      } else if (selectedOwner === 'AIE Skyline Limited') {
        // For 'AIE Skyline Limited', consider explicit AIE Skyline Limited transactions and those with no owner
        return isExplicitAIESkylineLimited || isAIESkylineLimitedDefault;
      } else {
        // For any other specific owner, only consider transactions explicitly assigned to them
        return t.vehicleOwner && t.vehicleOwner.name === selectedOwner;
      }
    });

    const ownerNetIncomes: { [ownerName: string]: number } = {};

    transactionsForOwingCalculation.forEach(t => {
      // Determine the effective owner for this transaction
      let effectiveOwnerName: string | null = null;
      if (t.vehicleOwner) {
        effectiveOwnerName = t.vehicleOwner.name;
      } else {
        // If no vehicle owner, assign to "AIE Skyline Limited" for calculation purposes
        effectiveOwnerName = 'AIE Skyline Limited';
      }

      if (effectiveOwnerName) {
        if (!ownerNetIncomes[effectiveOwnerName]) {
          ownerNetIncomes[effectiveOwnerName] = 0;
        }
        ownerNetIncomes[effectiveOwnerName] += (t.type === 'income' ? t.amount : -t.amount);
      }
    });

    let totalOwing = 0;
    if (selectedOwner === 'all') {
      // If 'all', sum up negative net incomes for all owners (including AIE Skyline Limited)
      for (const ownerName in ownerNetIncomes) {
        if (ownerNetIncomes[ownerName] < 0) {
          totalOwing += Math.abs(ownerNetIncomes[ownerName]);
        }
      }
    } else if (selectedOwner in ownerNetIncomes) {
      // If a specific owner is selected, return their owing if negative
      totalOwing = Math.max(0, -ownerNetIncomes[selectedOwner]);
    }
    
    return totalOwing;
  }, [transactions, selectedOwner, type, category, paymentStatus, selectedCustomerId, accountFilter, startDate, endDate, vehicles]);


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
    groupFilter,
    setGroupFilter,
    owners,
    filteredTransactions,
    accountSummary,
    totalOwingFromOwners // Ensure this is returned for FinancialSummary
  };
};
