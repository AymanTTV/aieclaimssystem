// src/components/finance/FinanceFilters.tsx
import React, { useState, useMemo } from 'react';
import SearchableSelect from '../ui/SearchableSelect';
import DateRangePicker from '../ui/DateRangePicker';
import {
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  X,
  Building2,
  Car,
  Repeat,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
} from 'date-fns';

interface FinanceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  type: 'all' | 'income' | 'expense';
  onTypeChange: (type: 'all' | 'income' | 'expense') => void;
  onStatusFilterChange: (status: string) => void;
  categoryFilter: string | string[];
  onCategoryFilterChange: (category: string | string[]) => void;
  dateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  owner: string | string[];
  onOwnerChange: (owner: string | string[]) => void;
  owners: string[];
  accountFilter: string | string[];
  onAccountFilterChange: (accountId: string | string[]) => void;
  accounts: { id: string; name: string }[];
  accountSummary: { income: number; expense: number; balance: number } | null;
  categories: string[];
  groupFilter: string | string[];
  onGroupFilterChange: (groupId: string | string[]) => void;
  groupOptions: { id: string; name: string }[];
  departmentFilter: string | string[];
  onDepartmentFilterChange: (departmentId: string | string[]) => void;
  departments: { id: string; name: string }[];
  customerFilter: string | string[];
  onCustomerFilterChange: (customerId: string | string[]) => void;
  customers: { id: string; name: string }[];
  vehicleFilter: string | string[];
  onVehicleFilterChange: (vehicleId: string | string[]) => void;
  vehicles: { id: string; registrationNumber: string; make: string; model: string }[];
  showLinked: 'all' | 'linked' | 'unlinked';
  onShowLinkedChange: (value: 'all' | 'linked' | 'unlinked') => void;
  recurringFilter: string;
  onRecurringFilterChange: (value: string) => void;
  recurringFrequency: string;
  onRecurringFrequencyChange: (value: string) => void;
  profitTrackingFilter?: 'all' | 'has_profit' | 'legacy';
  onProfitTrackingFilterChange?: (value: 'all' | 'has_profit' | 'legacy') => void;
}

const FinanceFilters: React.FC<FinanceFiltersProps> = ({
  dateRange,
  onDateRangeChange,
  type,
  onTypeChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  owner,
  onOwnerChange,
  owners,
  accountFilter,
  onAccountFilterChange,
  accounts,
  groupFilter,
  onGroupFilterChange,
  groupOptions,
  departmentFilter,
  onDepartmentFilterChange,
  departments,
  customerFilter,
  onCustomerFilterChange,
  customers,
  vehicleFilter,
  onVehicleFilterChange,
  vehicles,
  categories,
  showLinked,
  onShowLinkedChange,
  recurringFilter,
  onRecurringFilterChange,
  recurringFrequency,
  onRecurringFrequencyChange,
  profitTrackingFilter = 'all',
  onProfitTrackingFilterChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryOptions = useMemo(
    () => [{ id: 'all', label: 'All Categories' }, ...categories.map((cat) => ({ id: cat, label: cat }))],
    [categories]
  );
  const groupSelectOptions = useMemo(
    () => [
      { id: 'all', label: 'All Groups' },
      { id: 'no_group_assigned', label: 'No Group Assigned' },
      ...groupOptions.map((g) => ({ id: g.id, label: g.name })),
    ],
    [groupOptions]
  );
  const deptSelectOptions = useMemo(
    () => [
      { id: 'all', label: 'All Departments' },
      { id: 'no_department_assigned', label: 'No Department Assigned' },
      ...departments.map((d) => ({ id: d.id, label: d.name })),
    ],
    [departments]
  );
  const ownerOptions = useMemo(
    () => [
      { id: 'all', label: 'All Owners' },
      { id: 'no_owner_assigned', label: 'No Vehicle Assigned' },
      ...owners.map((o) => ({ id: o, label: o })),
    ],
    [owners]
  );
  const customerOptions = useMemo(
    () => [
      { id: 'all', label: 'All Customers' },
      { id: 'no_customer_assigned', label: 'No Customer Assigned' },
      ...customers.map((c) => ({ id: c.id, label: c.name })),
    ],
    [customers]
  );
  const vehicleOptions = useMemo(
    () => [
      { id: 'all', label: 'All Vehicles' },
      { id: 'no_vehicle_assigned', label: 'No Vehicle Assigned' },
      ...vehicles.map((v) => ({
        id: v.id,
        label: `${v.make} ${v.model} (${v.registrationNumber})`,
      })),
    ],
    [vehicles]
  );
  const accountOptions = useMemo(
    () => [
      { id: 'all', label: 'All Accounts' },
      { id: 'no_account_assigned', label: 'No Account Assigned' },
      ...accounts.map((acc) => ({ id: acc.id, label: acc.name })),
    ],
    [accounts]
  );

  const isAll = (val: string | string[]) => {
    if (Array.isArray(val)) return val.length === 0 || val.includes('all') || (val.length === 1 && val[0] === '');
    return val === 'all' || val === '';
  };

  const isAccountDefault = (val: string | string[]) => {
    if (Array.isArray(val)) return val.length === 0 || (val.length === 1 && val[0] === 'all');
    return !val || val === '' || val === 'all';
  };

  const createMultiHandler = (onChange: (val: string | string[]) => void) => (val: any) => {
    if (val == null) return onChange([]);
    if (Array.isArray(val)) {
      const cleaned = val.filter(Boolean);
      if (cleaned.includes('all')) return onChange(['all']);
      return onChange(cleaned.length === 0 ? [] : cleaned);
    }
    if (val === '') return onChange([]);
    if (val === 'all') return onChange(['all']);
    return onChange(val);
  };

  const handleAccountChange = (val: any) => {
    if (val == null) return onAccountFilterChange([]);
    if (Array.isArray(val)) {
      const cleaned = val.filter(Boolean);
      if (cleaned.includes('all')) {
        const keep: string[] = ['all'];
        if (cleaned.includes('no_account_assigned')) keep.push('no_account_assigned');
        return onAccountFilterChange(keep);
      }
      return onAccountFilterChange(cleaned.length === 0 ? [] : cleaned);
    }
    if (val === '') return onAccountFilterChange([]);
    if (val === 'all') return onAccountFilterChange(['all']);
    return onAccountFilterChange(val);
  };

  const dateDisplayLabel = useMemo(() => {
    if (!dateRange.start && !dateRange.end) return 'All Dates';
    const now = new Date();
    if (
      dateRange.start &&
      dateRange.end &&
      format(dateRange.start, 'yyyy-MM-dd') === format(startOfMonth(now), 'yyyy-MM-dd') &&
      format(dateRange.end, 'yyyy-MM-dd') === format(endOfMonth(now), 'yyyy-MM-dd')
    ) {
      return 'This Month';
    }
    const lastMonth = subMonths(now, 1);
    if (
      dateRange.start &&
      dateRange.end &&
      format(dateRange.start, 'yyyy-MM-dd') === format(startOfMonth(lastMonth), 'yyyy-MM-dd') &&
      format(dateRange.end, 'yyyy-MM-dd') === format(endOfMonth(lastMonth), 'yyyy-MM-dd')
    ) {
      return 'Last Month';
    }
    if (
      dateRange.start &&
      dateRange.end &&
      format(dateRange.start, 'yyyy-MM-dd') === format(startOfYear(now), 'yyyy-MM-dd') &&
      format(dateRange.end, 'yyyy-MM-dd') === format(endOfYear(now), 'yyyy-MM-dd')
    ) {
      return 'This Year';
    }
    if (
      dateRange.start &&
      dateRange.end &&
      format(dateRange.start, 'yyyy-MM-dd') === format(dateRange.end, 'yyyy-MM-dd')
    ) {
      return format(dateRange.start, 'dd MMM yyyy');
    }
    if (dateRange.start && dateRange.end) {
      return `${format(dateRange.start, 'dd/MM/yy')} – ${format(dateRange.end, 'dd/MM/yy')}`;
    }
    if (dateRange.start) return `From ${format(dateRange.start, 'dd/MM/yy')}`;
    if (dateRange.end) return `To ${format(dateRange.end, 'dd/MM/yy')}`;
    return 'All Dates';
  }, [dateRange]);

  // Count active filters in the expanded section
  const advancedActiveCount = useMemo(() => {
    let count = 0;
    if (!isAccountDefault(accountFilter)) count++;
    if (!isAll(categoryFilter)) count++;
    if (!isAll(groupFilter)) count++;
    if (!isAll(departmentFilter)) count++;
    if (!isAll(customerFilter)) count++;
    if (!isAll(vehicleFilter)) count++;
    if (!isAll(owner)) count++;
    if (showLinked !== 'all') count++;
    if (recurringFilter !== 'all') count++;
    if (recurringFrequency !== 'all') count++;
    if (profitTrackingFilter !== 'all') count++;
    return count;
  }, [
    accountFilter,
    categoryFilter,
    groupFilter,
    departmentFilter,
    customerFilter,
    vehicleFilter,
    owner,
    showLinked,
    recurringFilter,
    recurringFrequency,
    profitTrackingFilter,
  ]);

  // Active chips for 1-click removal
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; onClear: () => void }[] = [];

    if (type !== 'all') {
      chips.push({
        id: 'type',
        label: `Type: ${type.toUpperCase()}`,
        onClear: () => onTypeChange('all'),
      });
    }

    if (dateRange.start || dateRange.end) {
      chips.push({
        id: 'date',
        label: `Date: ${dateDisplayLabel}`,
        onClear: () => onDateRangeChange({ start: null, end: null }),
      });
    }

    if (statusFilter !== 'all') {
      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        paid: 'Paid',
        partially_paid: 'Partially Paid',
      };
      chips.push({
        id: 'status',
        label: `Status: ${statusLabels[statusFilter] || statusFilter}`,
        onClear: () => onStatusFilterChange('all'),
      });
    }

    if (!isAccountDefault(accountFilter)) {
      const raw = Array.isArray(accountFilter) ? accountFilter : [accountFilter];
      const names = raw
        .map((id) => accountOptions.find((o) => o.id === id)?.label || id)
        .filter((n) => n && n !== 'All Accounts');
      if (names.length > 0) {
        chips.push({
          id: 'account',
          label: `Account: ${names.join(', ')}`,
          onClear: () => onAccountFilterChange([]),
        });
      }
    }

    if (!isAll(categoryFilter)) {
      const raw = Array.isArray(categoryFilter) ? categoryFilter : [categoryFilter];
      const names = raw.filter((c) => c && c !== 'all');
      if (names.length > 0) {
        chips.push({
          id: 'category',
          label: `Category: ${names.join(', ')}`,
          onClear: () => onCategoryFilterChange('all'),
        });
      }
    }

    if (!isAll(groupFilter)) {
      const raw = Array.isArray(groupFilter) ? groupFilter : [groupFilter];
      const names = raw
        .map((id) => groupSelectOptions.find((g) => g.id === id)?.label || id)
        .filter((n) => n && n !== 'All Groups');
      if (names.length > 0) {
        chips.push({
          id: 'group',
          label: `Group: ${names.join(', ')}`,
          onClear: () => onGroupFilterChange('all'),
        });
      }
    }

    if (!isAll(departmentFilter)) {
      const raw = Array.isArray(departmentFilter) ? departmentFilter : [departmentFilter];
      const names = raw
        .map((id) => deptSelectOptions.find((d) => d.id === id)?.label || id)
        .filter((n) => n && n !== 'All Departments');
      if (names.length > 0) {
        chips.push({
          id: 'dept',
          label: `Dept: ${names.join(', ')}`,
          onClear: () => onDepartmentFilterChange('all'),
        });
      }
    }

    if (!isAll(customerFilter)) {
      const raw = Array.isArray(customerFilter) ? customerFilter : [customerFilter];
      const names = raw
        .map((id) => customerOptions.find((c) => c.id === id)?.label || id)
        .filter((n) => n && n !== 'All Customers');
      if (names.length > 0) {
        chips.push({
          id: 'customer',
          label: `Customer: ${names.join(', ')}`,
          onClear: () => onCustomerFilterChange('all'),
        });
      }
    }

    if (!isAll(vehicleFilter)) {
      const raw = Array.isArray(vehicleFilter) ? vehicleFilter : [vehicleFilter];
      const names = raw
        .map((id) => vehicleOptions.find((v) => v.id === id)?.label || id)
        .filter((n) => n && n !== 'All Vehicles');
      if (names.length > 0) {
        chips.push({
          id: 'vehicle',
          label: `Vehicle: ${names.join(', ')}`,
          onClear: () => onVehicleFilterChange('all'),
        });
      }
    }

    if (!isAll(owner)) {
      const raw = Array.isArray(owner) ? owner : [owner];
      const names = raw
        .map((id) => ownerOptions.find((o) => o.id === id)?.label || id)
        .filter((n) => n && n !== 'All Owners');
      if (names.length > 0) {
        chips.push({
          id: 'owner',
          label: `Owner: ${names.join(', ')}`,
          onClear: () => onOwnerChange('all'),
        });
      }
    }

    if (showLinked !== 'all') {
      chips.push({
        id: 'linked',
        label: `Linked: ${showLinked === 'linked' ? 'Linked Only' : 'Unlinked Only'}`,
        onClear: () => onShowLinkedChange('all'),
      });
    }

    if (recurringFilter !== 'all') {
      const recLabels: Record<string, string> = {
        active_recurring: 'Active Only',
        recurring_history: 'History Only',
        non_recurring: 'Non-Recurring',
      };
      chips.push({
        id: 'recurring',
        label: `Recurring: ${recLabels[recurringFilter] || recurringFilter}`,
        onClear: () => onRecurringFilterChange('all'),
      });
    }

    if (recurringFrequency !== 'all') {
      chips.push({
        id: 'frequency',
        label: `Period: ${recurringFrequency.charAt(0).toUpperCase() + recurringFrequency.slice(1)}`,
        onClear: () => onRecurringFrequencyChange('all'),
      });
    }

    if (profitTrackingFilter !== 'all') {
      chips.push({
        id: 'profitTracking',
        label: `Profit: ${profitTrackingFilter === 'has_profit' ? 'Has Net Profit' : 'Legacy / Uncalculated'}`,
        onClear: () => onProfitTrackingFilterChange?.('all'),
      });
    }

    return chips;
  }, [
    type,
    dateRange,
    dateDisplayLabel,
    statusFilter,
    accountFilter,
    accountOptions,
    categoryFilter,
    groupFilter,
    groupSelectOptions,
    departmentFilter,
    deptSelectOptions,
    customerFilter,
    customerOptions,
    vehicleFilter,
    vehicleOptions,
    owner,
    ownerOptions,
    showLinked,
    recurringFilter,
    recurringFrequency,
    profitTrackingFilter,
    onTypeChange,
    onDateRangeChange,
    onStatusFilterChange,
    onAccountFilterChange,
    onCategoryFilterChange,
    onGroupFilterChange,
    onDepartmentFilterChange,
    onCustomerFilterChange,
    onVehicleFilterChange,
    onOwnerChange,
    onShowLinkedChange,
    onRecurringFilterChange,
    onRecurringFrequencyChange,
    onProfitTrackingFilterChange,
  ]);

  const handleClearAll = () => {
    onTypeChange('all');
    onDateRangeChange({ start: null, end: null });
    onStatusFilterChange('all');
    onAccountFilterChange([]);
    onCategoryFilterChange('all');
    onGroupFilterChange('all');
    onDepartmentFilterChange('all');
    onCustomerFilterChange('all');
    onVehicleFilterChange('all');
    onOwnerChange('all');
    onShowLinkedChange('all');
    onRecurringFilterChange('all');
    onRecurringFrequencyChange('all');
    onProfitTrackingFilterChange?.('all');
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs p-3 sm:p-4 text-[#0F172A] transition-all">
      {/* ─────────────────────────────────────────────────────────────
          1. COMPACT PRIMARY TOOLBAR (Minimal Vertical Footprint)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left Side: Core High-Frequency Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* A. Type Segmented Toggle */}
          <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => onTypeChange('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                type === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => onTypeChange('income')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50/70'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => onTypeChange('expense')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 hover:bg-rose-50/70'
              }`}
            >
              Expense
            </button>
          </div>

          {/* B. Date Range Presets & Month/Year Drilldown Picker */}
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            align="left"
          />

          {/* C. Payment Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className={`h-9 px-3 py-1.5 text-xs font-bold border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-2xs ${
                statusFilter !== 'all'
                  ? 'border-blue-400 text-blue-900 bg-blue-50/50'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              <option value="all">Payment Status: All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partially Paid</option>
            </select>
          </div>

          {/* D. Profit Tracking Dropdown */}
          <div className="relative">
            <select
              value={profitTrackingFilter}
              onChange={(e) => onProfitTrackingFilterChange?.(e.target.value as any)}
              className={`h-9 px-3 py-1.5 text-xs font-bold border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer shadow-2xs ${
                profitTrackingFilter !== 'all'
                  ? 'border-emerald-500 text-emerald-900 bg-emerald-50/70 ring-1 ring-emerald-200'
                  : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
              title="Profit Tracking"
            >
              <option value="all">Profit Tracking: All Records</option>
              <option value="has_profit">Has Net Profit</option>
              <option value="legacy">Legacy / Uncalculated</option>
            </select>
          </div>
        </div>

        {/* Right Side: Expand/Collapse & Reset Controls */}
        <div className="flex items-center gap-2">
          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="h-9 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Reset all 14 filters to default"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset All</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`h-9 inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shadow-2xs ${
              isExpanded || advancedActiveCount > 0
                ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100/70'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
            <span>{isExpanded ? 'Hide Filters' : 'More Filters'}</span>
            {advancedActiveCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full bg-blue-600 text-white min-w-4 text-center">
                {advancedActiveCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. ACTIVE FILTER CHIPS ROW (Fast 1-click removal)
         ───────────────────────────────────────────────────────────── */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 mt-2.5 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Active Filters ({activeChips.length}):
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs animate-in fade-in"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onClear}
                className="hover:text-rose-600 p-0.5 rounded-sm hover:bg-blue-100 transition-colors cursor-pointer"
                title={`Remove ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. EXPANDABLE ADVANCED FILTER DRAWER (Structured 3-Col Grid)
         ───────────────────────────────────────────────────────────── */}
      {isExpanded && (
        <div className="pt-3.5 border-t border-slate-200 mt-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* SECTION A: Financial Structure */}
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Accounts & Organization
                  </h4>
                </div>

                <SearchableSelect
                  label="Account"
                  labelClassName="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                  value={accountFilter}
                  onChange={handleAccountChange}
                  options={accountOptions}
                  isClearable={!isAccountDefault(accountFilter)}
                  isMulti={true}
                  multiEmptyMode="empty"
                  showAllChipInMulti={true}
                  allId="all"
                  placeholder="All Accounts..."
                />

                <SearchableSelect
                  label="Category"
                  labelClassName="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                  value={categoryFilter}
                  onChange={createMultiHandler(onCategoryFilterChange)}
                  options={categoryOptions}
                  isClearable={!isAll(categoryFilter)}
                  isMulti={true}
                  multiEmptyMode="empty"
                  showAllChipInMulti={true}
                  allId="all"
                  placeholder="All Categories..."
                />

                <SearchableSelect
                  label="Finance Group"
                  labelClassName="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                  value={groupFilter}
                  onChange={createMultiHandler(onGroupFilterChange)}
                  options={groupSelectOptions}
                  isClearable={!isAll(groupFilter)}
                  isMulti={true}
                  multiEmptyMode="empty"
                  showAllChipInMulti={true}
                  allId="all"
                  placeholder="All Groups..."
                />

                <SearchableSelect
                  label="Department"
                  labelClassName="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                  value={departmentFilter}
                  onChange={createMultiHandler(onDepartmentFilterChange)}
                  options={deptSelectOptions}
                  isClearable={!isAll(departmentFilter)}
                  isMulti={true}
                  multiEmptyMode="empty"
                  showAllChipInMulti={true}
                  allId="all"
                  placeholder="All Departments..."
                />
              </div>

              {/* SECTION B: Entities & Fleet */}
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Car className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Entities & Fleet
                  </h4>
                </div>

                <SearchableSelect
                  label="Customer"
                  labelClassName="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                  value={customerFilter}
                  onChange={createMultiHandler(onCustomerFilterChange)}
                  options={customerOptions}
                  isClearable={!isAll(customerFilter)}
                  isMulti={true}
                  multiEmptyMode="empty"
                  showAllChipInMulti={true}
                  allId="all"
                  placeholder="All Customers..."
                />

                <SearchableSelect
                  label="Vehicle"
                  labelClassName="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                  value={vehicleFilter}
                  onChange={createMultiHandler(onVehicleFilterChange)}
                  options={vehicleOptions}
                  isClearable={!isAll(vehicleFilter)}
                  isMulti={true}
                  multiEmptyMode="empty"
                  showAllChipInMulti={true}
                  allId="all"
                  placeholder="All Vehicles..."
                />

                <SearchableSelect
                  label="Owner"
                  labelClassName="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1"
                  value={owner}
                  onChange={createMultiHandler(onOwnerChange)}
                  options={ownerOptions}
                  isClearable={!isAll(owner)}
                  isMulti={true}
                  multiEmptyMode="empty"
                  showAllChipInMulti={true}
                  allId="all"
                  placeholder="All Owners..."
                />
              </div>

              {/* SECTION C: Attributes & Automation */}
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Repeat className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Attributes & Recurrence
                  </h4>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Linked Status
                  </label>
                  <select
                    value={showLinked}
                    onChange={(e) => onShowLinkedChange(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Transactions</option>
                    <option value="linked">Show Linked Only</option>
                    <option value="unlinked">Show Unlinked Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Recurring Mode
                  </label>
                  <select
                    value={recurringFilter}
                    onChange={(e) => onRecurringFilterChange(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Transactions</option>
                    <option value="active_recurring">Active Recurring Only</option>
                    <option value="recurring_history">Recurring History Only</option>
                    <option value="non_recurring">Non-Recurring Only</option>
                  </select>
                </div>

                {recurringFilter !== 'non_recurring' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Recurring Frequency
                    </label>
                    <select
                      value={recurringFrequency}
                      onChange={(e) => onRecurringFrequencyChange(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs shadow-2xs cursor-pointer"
                    >
                      <option value="all">All Frequencies</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="biannually">Biannually</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Profit Tracking
                  </label>
                  <select
                    value={profitTrackingFilter}
                    onChange={(e) => onProfitTrackingFilterChange?.(e.target.value as any)}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs shadow-2xs cursor-pointer"
                  >
                    <option value="all">All Records</option>
                    <option value="has_profit">Has Net Profit</option>
                    <option value="legacy">Legacy / Uncalculated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 text-xs">
              <span className="text-slate-500 font-medium">
                {activeChips.length > 0
                  ? `${activeChips.length} filter${activeChips.length > 1 ? 's' : ''} currently active`
                  : 'All filters at default'}
              </span>
              <div className="flex items-center gap-2">
                {activeChips.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1.5 font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-3.5 py-1.5 font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl shadow-2xs transition-colors cursor-pointer"
                >
                  Close Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceFilters;
