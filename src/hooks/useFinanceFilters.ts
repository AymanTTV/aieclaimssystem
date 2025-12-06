// src/hooks/useFinanceFilters.ts
import { useState, useMemo } from 'react';
import { Transaction, Vehicle, Account, Customer } from '../types';
import { isWithinInterval, parseISO, isValid } from 'date-fns';

export const useFinanceFilters = (
  transactions: Transaction[] = [],
  vehicles: Vehicle[] = [],
  accounts: Account[] = [],
  customers: Customer[] = []
) => {
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
  const [showLinked, setShowLinked] = useState<'all' | 'linked' | 'unlinked'>('all');
  
  // --- RECURRING FILTERS ---
  const [recurringFilter, setRecurringFilter] = useState<string>('all');
  const [recurringFrequency, setRecurringFrequency] = useState<string>('all');
  // -------------------------

  const owners = useMemo(() => {
    const ownerSet = new Set<string>();
    vehicles.forEach(vehicle => { if (vehicle.owner?.name) ownerSet.add(vehicle.owner.name); });
    if (transactions.some(t => !t.vehicleId || t.vehicleOwner?.name === 'AIE Skyline Limited')) ownerSet.add('AIE Skyline Limited');
    if (transactions.some(t => t.vehicleOwner?.name === 'AIE SKYLINE ACCOUNT')) ownerSet.add('AIE SKYLINE ACCOUNT');
    return Array.from(ownerSet).sort();
  }, [vehicles, transactions]);

  const dateRange = useMemo(() => ({ start: startDate, end: endDate }), [startDate, endDate]);

    const safeParseDate = (dateVal: any): Date | null => {
        if (!dateVal) return null;
        if (dateVal instanceof Date && isValid(dateVal)) return dateVal;
        if (dateVal.toDate) {
             const tsDate = dateVal.toDate();
             return isValid(tsDate) ? tsDate : null;
        }
        try {
            const isoDate = parseISO(dateVal);
            if (isValid(isoDate)) return isoDate;
            const genericDate = new Date(dateVal);
             if (isValid(genericDate)) return genericDate;
        } catch { }
        return null;
    };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const transactionDate = safeParseDate(transaction.date);
      if (!transactionDate) return false;

      const searchLower = searchQuery.toLowerCase();
      const vehicle = vehicles.find(v => v.id === transaction.vehicleId);
      const customer = customers.find(c => c.id === transaction.customerId);

      const matchesSearch = !searchQuery || [
        transaction.category, transaction.description, transaction.paymentReference,
        transaction.vehicleName, vehicle?.registrationNumber, transaction.vehicleOwner?.name,
        customer?.name, transaction.customerName
      ].some(field => field && field.toLowerCase().includes(searchLower));

      const matchesType = type === 'all' || transaction.type === type;
      const matchesCategory = category === 'all' || (transaction.category || '').toLowerCase() === category.toLowerCase();
      const matchesPaymentStatus = paymentStatus === 'all' || transaction.paymentStatus === paymentStatus;
      const matchesCustomer = !selectedCustomerId || transaction.customerId === selectedCustomerId;

      const matchesAccount = accountFilter === 'all' ||
        (accountFilter === 'no_account_assigned' && (!transaction.accountsFrom?.length && !transaction.accountsTo?.length)) ||
        (transaction.accountsFrom?.includes(accountFilter)) ||
        (transaction.accountsTo?.includes(accountFilter));

      let matchesOwner = false;
      if (selectedOwner === 'all') matchesOwner = true;
      else if (selectedOwner === 'no_owner_assigned') matchesOwner = !transaction.vehicleId && !transaction.vehicleOwner?.name;
      else matchesOwner = transaction.vehicleOwner?.name === selectedOwner || (!transaction.vehicleOwner?.name && transaction.vehicleId && selectedOwner === 'AIE Skyline Limited');
      if (selectedOwner === 'AIE SKYLINE ACCOUNT') matchesOwner = transaction.vehicleOwner?.name === 'AIE SKYLINE ACCOUNT';

      let matchesDateRange = true;
      if (startDate && endDate) {
          const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999);
          matchesDateRange = isWithinInterval(transactionDate, { start: startDate, end: endOfDay });
      } else if (startDate) matchesDateRange = transactionDate >= startDate;
      else if (endDate) { const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999); matchesDateRange = transactionDate <= endOfDay; }

      const matchesGroup = groupFilter === 'all' || (groupFilter === 'none' && !transaction.groupId) || transaction.groupId === groupFilter;
      const matchesLinked = showLinked === 'all' || (showLinked === 'linked' && !!transaction.referenceId) || (showLinked === 'unlinked' && !transaction.referenceId);

      // --- RECURRING STATUS LOGIC ---
      let matchesRecurring = true;
      if (recurringFilter === 'all') {
          matchesRecurring = true;
      } else if (recurringFilter === 'non_recurring') {
          matchesRecurring = !transaction.isRecurring;
      } else if (recurringFilter === 'active_recurring') {
          matchesRecurring = !!transaction.isRecurring && !!transaction.nextRecurringDate;
      } else if (recurringFilter === 'recurring_history') {
          matchesRecurring = !!transaction.isRecurring && !transaction.nextRecurringDate;
      }

      // --- FREQUENCY LOGIC (FIXED) ---
      let matchesFrequency = true;
      if (recurringFrequency !== 'all') {
          // Only check frequency if the transaction IS recurring
          if (transaction.isRecurring) {
              matchesFrequency = transaction.recurringFrequency === recurringFrequency;
          } else {
              // Non-recurring transactions don't match any specific frequency filter
              matchesFrequency = false; 
          }
      }

      return matchesSearch && matchesType && matchesCategory && matchesPaymentStatus && matchesCustomer && matchesOwner && matchesAccount && matchesDateRange && matchesGroup && matchesLinked && matchesRecurring && matchesFrequency;
    }).sort((a, b) => {
        const dateA = safeParseDate(a.date)?.getTime() || 0;
        const dateB = safeParseDate(b.date)?.getTime() || 0;
        if (dateB !== dateA) return dateB - dateA;
        const timeA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
        const timeB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
        return timeB - timeA;
    });
  }, [
    transactions, searchQuery, type, category, paymentStatus,
    selectedCustomerId, selectedOwner, accountFilter, startDate, endDate,
    groupFilter, showLinked, recurringFilter, recurringFrequency, 
    vehicles, customers,
  ]);

  const totalOwingFromOwners = useMemo(() => {
    const ownerNetIncomes: { [ownerName: string]: number } = {};
    transactions.forEach(t => {
      let effectiveOwnerName: string | null = t.vehicleOwner?.name || (t.vehicleId ? 'AIE Skyline Limited' : null);
      if (t.vehicleOwner?.name === 'AIE SKYLINE ACCOUNT') effectiveOwnerName = 'AIE SKYLINE ACCOUNT';
      if (effectiveOwnerName) {
        if (!ownerNetIncomes[effectiveOwnerName]) ownerNetIncomes[effectiveOwnerName] = 0;
        ownerNetIncomes[effectiveOwnerName] += (t.type === 'income' ? t.amount : -t.amount);
      }
    });
    let totalOwing = 0;
    for (const ownerName in ownerNetIncomes) { if (ownerName !== 'AIE Skyline Limited' && ownerName !== 'AIE SKYLINE ACCOUNT' && ownerNetIncomes[ownerName] < 0) totalOwing += Math.abs(ownerNetIncomes[ownerName]); }
    return totalOwing;
  }, [transactions]);

  const accountSummary = useMemo(() => {
    if (accountFilter === 'all' || accountFilter === 'no_account_assigned') return null;
    let income = 0; let expense = 0;
    filteredTransactions.forEach(t => {
        if (t.type === 'income' && t.accountsTo?.includes(accountFilter)) income += t.amount;
        else if (t.type === 'expense' && t.accountsFrom?.includes(accountFilter)) expense += t.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions, accountFilter]);

  const setDateRange = (range: { start: Date | null; end: Date | null }) => {
    setStartDate(range.start);
    setEndDate(range.end);
  };

  return {
    searchQuery, setSearchQuery,
    type, setType,
    category, setCategory,
    paymentStatus, setPaymentStatus,
    dateRange, setDateRange,
    selectedCustomerId, setSelectedCustomerId,
    selectedOwner, setSelectedOwner,
    accountFilter, setAccountFilter,
    groupFilter, setGroupFilter,
    showLinked, setShowLinked,
    recurringFilter, setRecurringFilter, 
    recurringFrequency, setRecurringFrequency, 
    owners,
    filteredTransactions,
    accountSummary,
    totalOwingFromOwners,
  };
};