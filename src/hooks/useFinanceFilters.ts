// src/hooks/useFinanceFilters.ts
import { useState, useMemo } from 'react';
import { Transaction, Vehicle, Account } from '../types';
import { isWithinInterval, parseISO, isValid } from 'date-fns';

export const useFinanceFilters = (
  transactions: Transaction[] = [],
  vehicles: Vehicle[] = [],
  accounts: Account[] = []
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [paymentStatus, setPaymentStatus] = useState<
    'all' | 'paid' | 'unpaid' | 'partially_paid'
  >('all');

  const [category, setCategory] = useState<string | string[]>('all');
  const [selectedOwner, setSelectedOwner] = useState<string | string[]>('all');
  const [accountFilter, setAccountFilter] = useState<string | string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string | string[]>('all');
  const [customerFilter, setCustomerFilter] = useState<string | string[]>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string | string[]>('all');
  const [showLinked, setShowLinked] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [recurringFilter, setRecurringFilter] = useState<string>('all');
  const [recurringFrequency, setRecurringFrequency] = useState<string>('all');

  const normalizeFilter = (val: string | string[], defaultVal = 'all') => {
    if (Array.isArray(val)) {
      return val.length === 0 || val.includes(defaultVal) ? ['all'] : val;
    }
    return !val || val === defaultVal ? ['all'] : [val];
  };

  const owners = useMemo(() => {
    const ownerSet = new Set<string>();
    vehicles.forEach((vehicle) => {
      if (vehicle.owner?.name) ownerSet.add(vehicle.owner.name);
    });
    if (transactions.some((t) => !t.vehicleId || t.vehicleOwner?.name === 'AIE Skyline Limited'))
      ownerSet.add('AIE Skyline Limited');
    if (transactions.some((t) => t.vehicleOwner?.name === 'AIE SKYLINE ACCOUNT'))
      ownerSet.add('AIE SKYLINE ACCOUNT');
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
    } catch {}
    return null;
  };

  const filteredTransactions = useMemo(() => {
    const catFilters = normalizeFilter(category);
    const ownerFilters = normalizeFilter(selectedOwner);
    const groupFilters = normalizeFilter(groupFilter);
    const custFilters = normalizeFilter(customerFilter);
    const vehFilters = normalizeFilter(vehicleFilter);

    const rawAccFilter = Array.isArray(accountFilter)
      ? accountFilter
      : accountFilter
        ? [accountFilter]
        : [];
    const cleanAccFilter = rawAccFilter.filter(
      (f) => f && f !== '' && f !== 'null' && f !== 'undefined'
    );

    const filtered = transactions.filter((transaction) => {
      const transactionDate = safeParseDate(transaction.date);
      if (!transactionDate) return false;

      // 1. Search Query
      const searchLower = searchQuery.toLowerCase();
      const vehicle = vehicles.find((v) => v.id === transaction.vehicleId);

      const matchesSearch =
        !searchQuery ||
        [
          transaction.category,
          transaction.description,
          transaction.paymentReference,
          transaction.vehicleName,
          vehicle?.registrationNumber,
          transaction.vehicleOwner?.name,
          transaction.customerName
        ].some((field) => field && field.toLowerCase().includes(searchLower));

      const matchesType = type === 'all' || transaction.type === type;
      const matchesPaymentStatus = paymentStatus === 'all' || transaction.paymentStatus === paymentStatus;

      const matchesCategory =
        catFilters.includes('all') ||
        catFilters.some((c) => (transaction.category || '').toLowerCase() === c.toLowerCase());

      const matchesGroup =
        groupFilters.includes('all') ||
        groupFilters.some((g) => {
          if (g === 'none') return !transaction.groupId;
          return transaction.groupId === g;
        });

      const matchesCustomer =
        custFilters.includes('all') ||
        custFilters.some((c) => {
          if (c === 'no_customer_assigned') return !transaction.customerId && !transaction.customerName;
          return transaction.customerId === c || transaction.customerName === c;
        });

      const matchesVehicle =
        vehFilters.includes('all') ||
        vehFilters.some((v) => {
          if (v === 'no_vehicle_assigned') return !transaction.vehicleId && !transaction.vehicleName;
          return transaction.vehicleId === v || transaction.vehicleName === v;
        });

      let matchesAccount = false;
      const assignedAccountIds = new Set<string>();

      if ((transaction as any).accountId) assignedAccountIds.add((transaction as any).accountId);

      if (Array.isArray((transaction as any).accountsFrom)) {
        (transaction as any).accountsFrom.filter(Boolean).forEach((id: string) => assignedAccountIds.add(id));
      }
      if (Array.isArray((transaction as any).accountsTo)) {
        (transaction as any).accountsTo.filter(Boolean).forEach((id: string) => assignedAccountIds.add(id));
      }

      // Check if it has any assigned IDs or a related account name
      const hasAccountAssigned = assignedAccountIds.size > 0 || !!(transaction as any).relatedAccountName;

      if (cleanAccFilter.length === 0) {
        matchesAccount = !hasAccountAssigned;
      } else {
        const showAll = cleanAccFilter.includes('all');
        const showUnassignedExplicitly = cleanAccFilter.includes('no_account_assigned');

        if (showAll) {
          matchesAccount = true;
        } else {
          const selectedIds = cleanAccFilter.filter(
            (x) => x !== 'no_account_assigned' && x !== 'all'
          );

          // 1. Check direct ID matches
          let anyMatch = selectedIds.some((id) => assignedAccountIds.has(id));

          // 2. Check if the destination/source account matches via relatedAccountName (for Transfer Dest/Source)
          if (!anyMatch && (transaction as any).relatedAccountName) {
            const relatedStr = (transaction as any).relatedAccountName;
            anyMatch = selectedIds.some((id) => {
              const acc = accounts.find((a) => a.id === id);
              return acc && acc.name && relatedStr.includes(acc.name);
            });
          }

          matchesAccount = anyMatch;
          
          if (showUnassignedExplicitly && !hasAccountAssigned) matchesAccount = true;
        }
      }

      const matchesOwner =
        ownerFilters.includes('all') ||
        ownerFilters.some((filterOwner) => {
          if (filterOwner === 'no_owner_assigned') {
            const hasVehicleId = !!transaction.vehicleId;
            const vehicleExists = hasVehicleId && vehicles.some((v) => v.id === transaction.vehicleId);
            const hasSnapshotName = !!transaction.vehicleName;
            return !hasVehicleId || (!vehicleExists && !hasSnapshotName);
          }
          if (filterOwner === 'AIE SKYLINE ACCOUNT') {
            return transaction.vehicleOwner?.name === 'AIE SKYLINE ACCOUNT';
          }
          let isMatch = transaction.vehicleOwner?.name === filterOwner;
          if (
            !isMatch &&
            !transaction.vehicleOwner?.name &&
            transaction.vehicleId &&
            filterOwner === 'AIE Skyline Limited'
          ) {
            isMatch = true;
          }
          return isMatch;
        });

      let matchesDateRange = true;
      if (startDate && endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        matchesDateRange = isWithinInterval(transactionDate, { start: startDate, end: endOfDay });
      } else if (startDate) {
        matchesDateRange = transactionDate >= startDate;
      } else if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        matchesDateRange = transactionDate <= endOfDay;
      }

      const matchesLinked =
        showLinked === 'all' ||
        (showLinked === 'linked' && !!transaction.referenceId) ||
        (showLinked === 'unlinked' && !transaction.referenceId);

      let matchesRecurring = true;
      if (recurringFilter === 'all') {
        matchesRecurring = true;
      } else if (recurringFilter === 'non_recurring') {
        matchesRecurring = !(transaction as any).isRecurring;
      } else if (recurringFilter === 'active_recurring') {
        matchesRecurring = !!(transaction as any).isRecurring && !!(transaction as any).nextRecurringDate;
      } else if (recurringFilter === 'recurring_history') {
        matchesRecurring = !!(transaction as any).isRecurring && !(transaction as any).nextRecurringDate;
      }

      let matchesFrequency = true;
      if (recurringFrequency !== 'all') {
        if ((transaction as any).isRecurring) {
          matchesFrequency = (transaction as any).recurringFrequency === recurringFrequency;
        } else {
          matchesFrequency = false;
        }
      }

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesPaymentStatus &&
        matchesOwner &&
        matchesAccount &&
        matchesCustomer &&
        matchesVehicle &&
        matchesDateRange &&
        matchesGroup &&
        matchesLinked &&
        matchesRecurring &&
        matchesFrequency
      );
    });

    return filtered.sort((a, b) => {
      const dateA = safeParseDate(a.date)?.getTime() || 0;
      const dateB = safeParseDate(b.date)?.getTime() || 0;
      if (dateB !== dateA) return dateB - dateA;

      const timeA = (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate().getTime() : a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const timeB = (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate().getTime() : b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return timeB - timeA;
    });
  }, [
    transactions, searchQuery, type, category, paymentStatus, selectedOwner,
    accountFilter, customerFilter, vehicleFilter, startDate, endDate, groupFilter, 
    showLinked, recurringFilter, recurringFrequency, vehicles, accounts
  ]);

  const totalOwingFromOwners = useMemo(() => {
    const ownerBalances: { [ownerName: string]: number } = {};
    const ownerFilters = normalizeFilter(selectedOwner);

    transactions.forEach((t) => {
      let effectiveOwnerName: string | null = t.vehicleOwner?.name || (t.vehicleId ? 'AIE Skyline Limited' : null);
      if (t.vehicleOwner?.name === 'AIE SKYLINE ACCOUNT') effectiveOwnerName = 'AIE SKYLINE ACCOUNT';

      if (effectiveOwnerName) {
        if (!ownerBalances[effectiveOwnerName]) ownerBalances[effectiveOwnerName] = 0;
        ownerBalances[effectiveOwnerName] += t.type === 'income' ? t.amount : -t.amount;
      }
    });

    let totalOwing = 0;
    for (const ownerName in ownerBalances) {
      const balance = ownerBalances[ownerName];
      if (balance >= 0) continue;

      if (ownerFilters.includes('all')) {
        if (ownerName === 'AIE Skyline Limited' || ownerName === 'AIE SKYLINE ACCOUNT') continue;
        totalOwing += Math.abs(balance);
      } else if (ownerFilters.includes(ownerName)) {
        totalOwing += Math.abs(balance);
      }
    }
    return totalOwing;
  }, [transactions, selectedOwner]);

  const totalOwingFromAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) return 0;

    const balances = new Map<string, number>();
    accounts.forEach((acc) => balances.set(acc.id, 0));

    transactions.forEach((txn) => {
      const amt = txn.amount;
      const singleAccountId = (txn as any).accountId as string | undefined;

      if (singleAccountId) {
        if (balances.has(singleAccountId)) {
          const prev = balances.get(singleAccountId) || 0;
          balances.set(singleAccountId, prev + (txn.type === 'income' ? amt : -amt));
        }
      }

      if (txn.type === 'income' && (txn as any).accountsTo) {
        (txn as any).accountsTo.forEach((id: string) => {
          if (balances.has(id)) balances.set(id, (balances.get(id) || 0) + amt);
        });
      } else if (txn.type === 'expense' && (txn as any).accountsFrom) {
        (txn as any).accountsFrom.forEach((id: string) => {
          if (balances.has(id)) balances.set(id, (balances.get(id) || 0) - amt);
        });
      }
    });

    let totalOwing = 0;
    const rawAccFilter = Array.isArray(accountFilter) ? accountFilter : accountFilter ? [accountFilter] : [];
    const cleanAccFilter = rawAccFilter.filter((f) => f && f !== '' && f !== 'null' && f !== 'undefined');

    const isFilterEmpty = cleanAccFilter.length === 0;
    const isAllSelected = cleanAccFilter.includes('all');

    balances.forEach((balance, id) => {
      if (balance >= 0) return;

      const acc = accounts.find((a) => a.id === id);
      if (!acc) return;

      if (isFilterEmpty || isAllSelected) {
        if (acc.name === 'AIE SKYLINE ACCOUNT' || acc.name === 'AIE Skyline Limited' || acc.name === 'AIE SKYLINE ACCOUNTS') return;
        totalOwing += Math.abs(balance);
      } else {
        if (cleanAccFilter.includes(id)) {
          totalOwing += Math.abs(balance);
        }
      }
    });

    return totalOwing;
  }, [transactions, accounts, accountFilter]);

  const accountSummary = useMemo(() => {
    const rawAccFilter = Array.isArray(accountFilter) ? accountFilter : accountFilter ? [accountFilter] : [];
    const cleanAccFilter = rawAccFilter.filter((f) => f && f !== '' && f !== 'null' && f !== 'undefined');

    if (cleanAccFilter.length === 0) return null;
    if (cleanAccFilter.includes('all')) return null;

    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
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
    selectedOwner, setSelectedOwner,
    accountFilter, setAccountFilter,
    groupFilter, setGroupFilter,
    customerFilter, setCustomerFilter,
    vehicleFilter, setVehicleFilter,
    showLinked, setShowLinked,
    recurringFilter, setRecurringFilter,
    recurringFrequency, setRecurringFrequency,
    owners,
    filteredTransactions,
    accountSummary,
    totalOwingFromOwners,
    totalOwingFromAccounts
  };
};