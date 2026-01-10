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
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partially_paid'>('all');
  
  // --- Updated: Allow string | string[] for Multi-Select ---
  const [category, setCategory] = useState<string | string[]>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | string[]>('');
  const [selectedOwner, setSelectedOwner] = useState<string | string[]>('all');
  const [accountFilter, setAccountFilter] = useState<string | string[]>('all');
  const [groupFilter, setGroupFilter] = useState<string | string[]>('all');
  // ---------------------------------------------------------

  const [showLinked, setShowLinked] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [recurringFilter, setRecurringFilter] = useState<string>('all');
  const [recurringFrequency, setRecurringFrequency] = useState<string>('all');

  // Helper: Normalize filters to array for consistent logic
  const normalizeFilter = (val: string | string[], defaultVal = 'all') => {
     if (Array.isArray(val)) {
         return (val.length === 0 || val.includes(defaultVal)) ? ['all'] : val;
     }
     return (!val || val === defaultVal) ? ['all'] : [val];
  };

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
    // Normalize filters once
    const catFilters = normalizeFilter(category);
    const ownerFilters = normalizeFilter(selectedOwner);
    const customerFilters = normalizeFilter(selectedCustomerId, ''); // '' is default for customer
    const accFilters = normalizeFilter(accountFilter);
    const groupFilters = normalizeFilter(groupFilter);

    return transactions.filter(transaction => {
      const transactionDate = safeParseDate(transaction.date);
      if (!transactionDate) return false;

      // 1. Search Query
      const searchLower = searchQuery.toLowerCase();
      const vehicle = vehicles.find(v => v.id === transaction.vehicleId);
      const customer = customers.find(c => c.id === transaction.customerId);

      const matchesSearch = !searchQuery || [
        transaction.category, transaction.description, transaction.paymentReference,
        transaction.vehicleName, vehicle?.registrationNumber, transaction.vehicleOwner?.name,
        customer?.name, transaction.customerName
      ].some(field => field && field.toLowerCase().includes(searchLower));

      // 2. Simple Filters
      const matchesType = type === 'all' || transaction.type === type;
      const matchesPaymentStatus = paymentStatus === 'all' || transaction.paymentStatus === paymentStatus;

      // 3. Multi-Select Filters

      // Category
      const matchesCategory = catFilters.includes('all') || catFilters.some(c => (transaction.category || '').toLowerCase() === c.toLowerCase());

      // Customer
      // Note: customerFilters normalized uses 'all' internally if empty, but incoming ID is usually specific uuid
      const matchesCustomer = customerFilters.includes('all') || customerFilters.includes(transaction.customerId || '');

      // Group
      const matchesGroup = groupFilters.includes('all') || groupFilters.some(g => {
          if (g === 'none') return !transaction.groupId;
          return transaction.groupId === g;
      });

      // Account (Multi-Select Logic)
      // Check if ANY of the transaction's accounts match ANY of the selected filters
      const matchesAccount = accFilters.includes('all') || accFilters.some(filterId => {
          if (filterId === 'no_account_assigned') {
              return (!transaction.accountsFrom?.length && !transaction.accountsTo?.length);
          }
          return (transaction.accountsFrom?.includes(filterId)) || (transaction.accountsTo?.includes(filterId));
      });

      // Owner (Complex Multi-Select Logic)
      const matchesOwner = ownerFilters.includes('all') || ownerFilters.some(filterOwner => {
        if (filterOwner === 'no_owner_assigned') {
            const hasVehicleId = !!transaction.vehicleId;
            const vehicleExists = hasVehicleId && vehicles.some(v => v.id === transaction.vehicleId);
            const hasSnapshotName = !!transaction.vehicleName;
            return !hasVehicleId || (!vehicleExists && !hasSnapshotName);
        }
        if (filterOwner === 'AIE SKYLINE ACCOUNT') {
            return transaction.vehicleOwner?.name === 'AIE SKYLINE ACCOUNT';
        }
        // Standard match
        let isMatch = transaction.vehicleOwner?.name === filterOwner;
        // Legacy fallback
        if (!isMatch && !transaction.vehicleOwner?.name && transaction.vehicleId && filterOwner === 'AIE Skyline Limited') {
             isMatch = true;
        }
        return isMatch;
      });

      // 4. Date Range
      let matchesDateRange = true;
      if (startDate && endDate) {
          const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999);
          matchesDateRange = isWithinInterval(transactionDate, { start: startDate, end: endOfDay });
      } else if (startDate) matchesDateRange = transactionDate >= startDate;
      else if (endDate) { const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999); matchesDateRange = transactionDate <= endOfDay; }

      // 5. Other Filters
      const matchesLinked = showLinked === 'all' || (showLinked === 'linked' && !!transaction.referenceId) || (showLinked === 'unlinked' && !transaction.referenceId);

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

      let matchesFrequency = true;
      if (recurringFrequency !== 'all') {
          if (transaction.isRecurring) {
              matchesFrequency = transaction.recurringFrequency === recurringFrequency;
          } else {
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
    const ownerBalances: { [ownerName: string]: number } = {};
    const ownerFilters = normalizeFilter(selectedOwner);

    transactions.forEach(t => {
      let effectiveOwnerName: string | null = t.vehicleOwner?.name || (t.vehicleId ? 'AIE Skyline Limited' : null);
      if (t.vehicleOwner?.name === 'AIE SKYLINE ACCOUNT') effectiveOwnerName = 'AIE SKYLINE ACCOUNT';
      
      if (effectiveOwnerName) {
        if (!ownerBalances[effectiveOwnerName]) ownerBalances[effectiveOwnerName] = 0;
        ownerBalances[effectiveOwnerName] += (t.type === 'income' ? t.amount : -t.amount);
      }
    });

    let totalOwing = 0;
    
    for (const ownerName in ownerBalances) {
      const balance = ownerBalances[ownerName];
      if (balance >= 0) continue; 

      if (ownerFilters.includes('all')) {
        if (ownerName === 'AIE Skyline Limited' || ownerName === 'AIE SKYLINE ACCOUNT') continue;
        totalOwing += Math.abs(balance);
      } 
      else if (ownerFilters.includes(ownerName)) {
        totalOwing += Math.abs(balance);
      }
    }
    return totalOwing;
  }, [transactions, selectedOwner]);

  const totalOwingFromAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) return 0;
    
    const balances = new Map<string, number>();
    accounts.forEach(acc => balances.set(acc.id, 0));

    transactions.forEach(txn => {
        const amt = txn.amount;
        if (txn.type === 'income' && txn.accountsTo) {
            txn.accountsTo.forEach(id => {
                if (balances.has(id)) balances.set(id, (balances.get(id) || 0) + amt);
            });
        }
        else if (txn.type === 'expense' && txn.accountsFrom) {
             txn.accountsFrom.forEach(id => {
                if (balances.has(id)) balances.set(id, (balances.get(id) || 0) - amt);
            });
        }
    });

    let totalOwing = 0;
    const accFilters = normalizeFilter(accountFilter);

    balances.forEach((balance, id) => {
        if (balance >= 0) return; 

        const acc = accounts.find(a => a.id === id);
        if (!acc) return;

        if (accFilters.includes('all')) {
            if (acc.name === 'AIE SKYLINE ACCOUNT' || acc.name === 'AIE Skyline Limited' || acc.name === 'AIE SKYLINE ACCOUNTS') return;
            totalOwing += Math.abs(balance);
        } else {
            if (accFilters.includes(id)) {
                totalOwing += Math.abs(balance);
            }
        }
    });

    return totalOwing;
  }, [transactions, accounts, accountFilter]);

  const accountSummary = useMemo(() => {
    // If 'all' or empty, return null (global summary is handled elsewhere)
    // If multiple specific accounts selected, sum them up
    const accFilters = normalizeFilter(accountFilter);
    if (accFilters.includes('all')) return null;

    let income = 0; let expense = 0;
    filteredTransactions.forEach(t => {
        // Only count if this transaction touches one of the selected filter accounts
        // And strictly sum the amounts relevant to those accounts? 
        // Or just sum the whole transaction if it matches? 
        // Usually, summary reflects the filtered list.
        if (t.type === 'income') {
             // Check if any To account is in our filter list
             if (t.accountsTo?.some(id => accFilters.includes(id))) income += t.amount;
        }
        else if (t.type === 'expense') {
             if (t.accountsFrom?.some(id => accFilters.includes(id))) expense += t.amount;
        }
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
    totalOwingFromAccounts, 
  };
};