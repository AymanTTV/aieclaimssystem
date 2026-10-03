// src/hooks/useFinanceFilters.ts
import { useState, useMemo, useCallback } from 'react';
import { Transaction, Vehicle, Account } from '../types';
import { isWithinInterval, parseISO, isValid } from 'date-fns';

export const getTransactionAssignedAccountName = (
  txn: Transaction,
  vehicles: Vehicle[] = [],
  accounts: Account[] = []
): string | null => {
  const vehicle = vehicles.find(
    (v) => v.id === txn.vehicleId || (txn.vehicleName && v.registrationNumber === txn.vehicleName)
  );

  // Exact resolution matching TransactionTable
  const accId =
    (txn as any).accountId ||
    txn.accountFrom ||
    txn.accountTo ||
    vehicle?.owner?.accountId;

  if (accId) {
    const accStr = String(accId).trim();
    const accLower = accStr.toLowerCase();
    if (
      accLower !== 'unassigned' &&
      accLower !== 'unknown' &&
      accLower !== 'no_account_assigned' &&
      accLower !== 'no account assigned' &&
      accLower !== 'null' &&
      accLower !== 'undefined' &&
      accStr !== ''
    ) {
      const matched = accounts.find(
        (a) => a.id === accStr || a.name.toLowerCase() === accLower || a.name === accStr
      );
      if (matched && matched.name) return matched.name;
    }
  }

  // Check direct account names
  const accountNameCandidate =
    (txn as any).accountName ||
    txn.vehicleOwner?.name ||
    vehicle?.owner?.name ||
    vehicle?.owner?.accountName ||
    vehicle?.assignedAccountName;

  if (accountNameCandidate) {
    const str = String(accountNameCandidate).trim();
    const lower = str.toLowerCase();
    if (
      lower !== 'unassigned' &&
      lower !== 'unknown' &&
      lower !== 'no_account_assigned' &&
      lower !== 'no account assigned' &&
      lower !== 'null' &&
      lower !== 'undefined' &&
      str !== ''
    ) {
      const matched = accounts.find(
        (a) => a.id === str || a.name.toLowerCase() === lower || a.name === str
      );
      if (matched && matched.name) return matched.name;
      return str;
    }
  }

  // Check array accounts: accountsFrom / accountsTo
  const arrayIds: any[] = [];
  if (Array.isArray((txn as any).accountsFrom)) arrayIds.push(...(txn as any).accountsFrom);
  if (Array.isArray((txn as any).accountsTo)) arrayIds.push(...(txn as any).accountsTo);
  for (const item of arrayIds) {
    if (!item) continue;
    const str = String(item).trim();
    const lower = str.toLowerCase();
    if (
      lower === 'unassigned' ||
      lower === 'unknown' ||
      lower === 'no_account_assigned' ||
      lower === 'no account assigned' ||
      lower === 'null' ||
      lower === 'undefined' ||
      str === ''
    )
      continue;
    const matched = accounts.find(
      (a) => a.id === str || a.name.toLowerCase() === lower || a.name === str
    );
    if (matched?.name) return matched.name;
    return str;
  }

  // Other candidate properties
  const otherCandidates: any[] = [
    (txn as any).relatedAccountName,
    (txn as any).sourceAccountName,
    (txn as any).destinationAccountName,
    (txn as any).ownerName,
  ];

  for (const item of otherCandidates) {
    if (!item) continue;
    const str = String(item).trim();
    const lower = str.toLowerCase();
    if (
      lower === 'unassigned' ||
      lower === 'unknown' ||
      lower === 'no_account_assigned' ||
      lower === 'no account assigned' ||
      lower === 'null' ||
      lower === 'undefined' ||
      str === ''
    )
      continue;

    const matched = accounts.find(
      (a) => a.id === str || a.name.toLowerCase() === lower || a.name === str
    );
    if (matched?.name) return matched.name;
    return str;
  }

  if (accId) {
    const accStr = String(accId).trim();
    const accLower = accStr.toLowerCase();
    if (
      accLower !== 'unassigned' &&
      accLower !== 'unknown' &&
      accLower !== 'no_account_assigned' &&
      accLower !== 'no account assigned' &&
      accLower !== 'null' &&
      accLower !== 'undefined' &&
      accStr !== ''
    ) {
      return accStr;
    }
  }

  return null;
};

export const isDefaultViewTransaction = (
  transaction: Transaction,
  accounts: Account[] = [],
  vehicles: Vehicle[] = []
): boolean => {
  const assignedAccountName = getTransactionAssignedAccountName(transaction, vehicles, accounts);
  const rawAccountId = (transaction as any).accountId || transaction.accountFrom || transaction.accountTo;
  const rawAccountName = (transaction as any).accountName || transaction.vehicleOwner?.name;

  const hasValidAccountId =
    rawAccountId != null &&
    String(rawAccountId).trim() !== '' &&
    !['unassigned', 'unknown', 'no_account_assigned', 'no account assigned', 'null', 'undefined'].includes(
      String(rawAccountId).trim().toLowerCase()
    );

  const hasValidAccountName =
    rawAccountName != null &&
    String(rawAccountName).trim() !== '' &&
    !['unassigned', 'unknown', 'no_account_assigned', 'no account assigned', 'null', 'undefined'].includes(
      String(rawAccountName).trim().toLowerCase()
    );

  const hasAssignedAccountPill = Boolean(assignedAccountName);

  // 1. Mandatory Account Null Check & Forceful Exclusion:
  // On initial page load (when no filter is chosen), enforce a strict guard condition:
  // • IF accountId != null AND accountId != "" AND accountName != null (or if any assigned account pill is present)
  // • THEN FORCEFULLY EXCLUDE THE TRANSACTION FROM THIS VIEW.
  //
  // 2. Stop Keyword Matching on Assigned Accounts:
  // Do NOT match categories containing the word "Refund" or "Reversal" (such as "Road Tax Refund"
  // or "Vehicle Insurance Refunded") IF the transaction already has an assigned account attached.
  // Standard assigned refunds are regular financial entries and must only load when their specific account is selected.
  //
  // 3. Resulting State:
  // Transactions showing "Acc: VEHICLE OWNERS" or "Acc: AIE SKYLINE ACCOUNTS" must NOT render on page load.
  // Outside of active filters, display ONLY entries where the Account pill is completely missing/blank.
  if (hasAssignedAccountPill || hasValidAccountId || hasValidAccountName) {
    return false;
  }

  // Only entries where the Account pill is completely missing/blank can display in default view
  return true;
};

export const isNeedsAttentionTransaction = isDefaultViewTransaction;
export const isAdministrativeAttentionTransaction = isDefaultViewTransaction;

export const useFinanceFilters = (
  transactions: Transaction[] = [],
  vehicles: Vehicle[] = [],
  accounts: Account[] = [],
  groups: { id: string; name: string }[] = []
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
  const [departmentFilter, setDepartmentFilter] = useState<string | string[]>('all'); // ✅ Added
  const [customerFilter, setCustomerFilter] = useState<string | string[]>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string | string[]>('all');
  const [showLinked, setShowLinked] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [recurringFilter, setRecurringFilter] = useState<string>('all');
  const [recurringFrequency, setRecurringFrequency] = useState<string>('all');
  const [profitTrackingFilter, setProfitTrackingFilter] = useState<'all' | 'has_profit' | 'legacy'>('all');
  const [needsAttentionFilter, setNeedsAttentionFilter] = useState<boolean>(true);

  const needsAttentionCount = useMemo(() => {
    return transactions.filter((t) => isNeedsAttentionTransaction(t, accounts, vehicles)).length;
  }, [transactions, accounts, vehicles]);

  const normalizeFilter = (val: string | string[], defaultVal = 'all') => {
    if (Array.isArray(val)) {
      return val.length === 0 || val.includes(defaultVal) ? ['all'] : val;
    }
    return !val || val === defaultVal ? ['all'] : [val];
  };

  // Determine whether any explicit filter/account selection is active
  const hasActiveFilter = useMemo(() => {
    const catFilters = normalizeFilter(category);
    const ownerFilters = normalizeFilter(selectedOwner);
    const groupFilters = normalizeFilter(groupFilter);
    const deptFilters = normalizeFilter(departmentFilter);
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

    return (
      cleanAccFilter.length > 0 ||
      !vehFilters.includes('all') ||
      !groupFilters.includes('all') ||
      !deptFilters.includes('all') ||
      !custFilters.includes('all') ||
      !ownerFilters.includes('all') ||
      !catFilters.includes('all') ||
      type !== 'all' ||
      paymentStatus !== 'all' ||
      Boolean(startDate || endDate) ||
      Boolean(searchQuery && searchQuery.trim().length > 0) ||
      showLinked !== 'all' ||
      recurringFilter !== 'all' ||
      recurringFrequency !== 'all' ||
      profitTrackingFilter !== 'all'
    );
  }, [
    needsAttentionFilter,
    accountFilter,
    vehicleFilter,
    groupFilter,
    departmentFilter,
    customerFilter,
    selectedOwner,
    category,
    type,
    paymentStatus,
    startDate,
    endDate,
    searchQuery,
    showLinked,
    recurringFilter,
    recurringFrequency,
    profitTrackingFilter,
  ]);

  const handleResetAll = useCallback(() => {
    setSearchQuery('');
    setStartDate(null);
    setEndDate(null);
    setType('all');
    setPaymentStatus('all');
    setCategory('all');
    setSelectedOwner('all');
    setAccountFilter([]);
    setGroupFilter('all');
    setDepartmentFilter('all');
    setCustomerFilter('all');
    setVehicleFilter('all');
    setShowLinked('all');
    setRecurringFilter('all');
    setRecurringFrequency('all');
    setProfitTrackingFilter('all');
    setNeedsAttentionFilter(true);
  }, []);

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
    if (typeof dateVal?.toDate === 'function') {
      const tsDate = dateVal.toDate();
      return isValid(tsDate) ? tsDate : null;
    }
    if (typeof dateVal === 'object' && typeof dateVal?.seconds === 'number') {
      const tsDate = new Date(dateVal.seconds * 1000);
      if (isValid(tsDate)) return tsDate;
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
    // 1. Strict Initial Default View Rule (Outside Filters):
    // When NO toolbar filter or account is selected, display ONLY transactions that meet one of these two strict conditions:
    // 1. NO ACCOUNT ASSIGNED: accountId / accountName is NULL, empty (""), or "unassigned".
    // 2. REVERSAL PAYMENT: Transaction type or description explicitly contains "reversal" or "refund".
    // Completely EXCLUDE every other transaction type (including pending payments, standard rentals, maintenance, or regular income/expenses) if it has an account assigned.
    if (!hasActiveFilter) {
      const defaultOnly = transactions.filter((t) =>
        isDefaultViewTransaction(t, accounts, vehicles)
      );

      return defaultOnly.sort((a, b) => {
        const dateA = safeParseDate(a.date)?.getTime() || 0;
        const dateB = safeParseDate(b.date)?.getTime() || 0;
        if (dateB !== dateA) return dateB - dateA;

        const timeA = (a.createdAt as any)?.toDate
          ? (a.createdAt as any).toDate().getTime()
          : a.createdAt instanceof Date
          ? a.createdAt.getTime()
          : 0;
        const timeB = (b.createdAt as any)?.toDate
          ? (b.createdAt as any).toDate().getTime()
          : b.createdAt instanceof Date
          ? b.createdAt.getTime()
          : 0;
        return timeB - timeA;
      });
    }

    const catFilters = normalizeFilter(category);
    const ownerFilters = normalizeFilter(selectedOwner);
    const groupFilters = normalizeFilter(groupFilter);
    const deptFilters = normalizeFilter(departmentFilter); // ✅ Added
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
      if ((startDate || endDate) && !transactionDate) return false;

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
          if (g === 'no_group_assigned') return !transaction.groupId;
          return transaction.groupId === g;
        });

      const matchesDepartment =
        deptFilters.includes('all') ||
        deptFilters.some((d) => {
          if (d === 'no_department_assigned') return !transaction.departmentId;
          return transaction.departmentId === d;
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
      if (transaction.accountFrom) assignedAccountIds.add(transaction.accountFrom);
      if (transaction.accountTo) assignedAccountIds.add(transaction.accountTo);
      if (vehicle?.owner?.accountId) assignedAccountIds.add(vehicle.owner.accountId);

      if (Array.isArray((transaction as any).accountsFrom)) {
        (transaction as any).accountsFrom.filter(Boolean).forEach((id: string) => assignedAccountIds.add(id));
      }
      if (Array.isArray((transaction as any).accountsTo)) {
        (transaction as any).accountsTo.filter(Boolean).forEach((id: string) => assignedAccountIds.add(id));
      }

      const assignedAccountName = getTransactionAssignedAccountName(transaction, vehicles, accounts);
      const hasAccountAssigned = assignedAccountIds.size > 0 || !!assignedAccountName || !!(transaction as any).relatedAccountName;

      if (cleanAccFilter.length === 0 || cleanAccFilter.includes('all')) {
        matchesAccount = true;
      } else {
        const showUnassignedExplicitly = cleanAccFilter.includes('no_account_assigned');
        const selectedIds = cleanAccFilter.filter(
          (x) => x !== 'no_account_assigned' && x !== 'all'
        );

        let anyMatch = selectedIds.some((id) => assignedAccountIds.has(id));

        if (!anyMatch && assignedAccountName) {
          anyMatch = selectedIds.some((id) => {
            const acc = accounts.find((a) => a.id === id);
            return acc && acc.name.toLowerCase() === assignedAccountName.toLowerCase();
          });
        }

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

      const hasExplicitDealerCost =
        (transaction.dealerCost !== null && transaction.dealerCost !== undefined && transaction.dealerCost !== '' && Number(transaction.dealerCost) > 0) ||
        (transaction.subcontractorCost !== null && transaction.subcontractorCost !== undefined && transaction.subcontractorCost !== '' && Number(transaction.subcontractorCost) > 0);

      const hasExplicitProfit =
        hasExplicitDealerCost ||
        (transaction.isProfitEdited === true && transaction.netProfit !== null && transaction.netProfit !== undefined && Number(transaction.netProfit) !== 0) ||
        (transaction.netProfit !== null && transaction.netProfit !== undefined && hasExplicitDealerCost);

      let matchesProfitTracking = true;
      if (profitTrackingFilter === 'has_profit') {
        matchesProfitTracking = hasExplicitProfit;
      } else if (profitTrackingFilter === 'legacy') {
        matchesProfitTracking = !hasExplicitDealerCost;
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
        matchesDepartment && // ✅ Added
        matchesLinked &&
        matchesRecurring &&
        matchesFrequency &&
        matchesProfitTracking
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
    accountFilter, customerFilter, vehicleFilter, startDate, endDate, groupFilter, departmentFilter, 
    showLinked, recurringFilter, recurringFrequency, profitTrackingFilter, vehicles, accounts, groups, hasActiveFilter, needsAttentionFilter
  ]);

  const totalOwingFromOwners = useMemo(() => {
    if (!hasActiveFilter) return 0;

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
  }, [transactions, selectedOwner, hasActiveFilter]);

  const totalOwingFromAccounts = useMemo(() => {
    if (!hasActiveFilter) return 0;
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
  }, [transactions, accounts, accountFilter, hasActiveFilter]);

  const accountSummary = useMemo(() => {
    if (!hasActiveFilter) return null;
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
  }, [filteredTransactions, accountFilter, hasActiveFilter]);

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
    departmentFilter, setDepartmentFilter, // ✅ Returned
    customerFilter, setCustomerFilter,
    vehicleFilter, setVehicleFilter,
    showLinked, setShowLinked,
    recurringFilter, setRecurringFilter,
    recurringFrequency, setRecurringFrequency,
    profitTrackingFilter, setProfitTrackingFilter,
    needsAttentionFilter, setNeedsAttentionFilter,
    needsAttentionCount,
    owners,
    filteredTransactions,
    accountSummary,
    totalOwingFromOwners,
    totalOwingFromAccounts,
    hasActiveFilter,
    handleResetAll
  };
};