// src/hooks/useInvoiceFilters.ts
import { useState, useMemo } from 'react';
import { Invoice, Vehicle } from '../types/finance';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { derivePaymentStatus } from '../utils/paymentStatusHelper';

export const useInvoiceFilters = (
  invoices: Invoice[] = [],
  vehicles: Vehicle[] = []
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<string | string[]>('all');
  const [accountFilter, setAccountFilter] = useState<string | string[]>('all');
  const [groupFilter, setGroupFilter] = useState<string | string[]>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string | string[]>('all'); // ✅ Added
  const [showCompleted, setShowCompleted] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const normalizeFilter = (val: string | string[], defaultVal = 'all') => {
    if (Array.isArray(val)) {
      return val.length === 0 || val.includes(defaultVal) ? ['all'] : val;
    }
    return !val || val === defaultVal ? ['all'] : [val];
  };

  const filteredInvoices = useMemo(() => {
    const catFilters = normalizeFilter(categoryFilter);
    const accFilters = normalizeFilter(accountFilter);
    const grpFilters = normalizeFilter(groupFilter);
    const deptFilters = normalizeFilter(departmentFilter); // ✅ Added

    return invoices.filter((inv) => {
      // Dynamic Status Calculation derived strictly from owing balance:
      // if owing <= 0 -> 'paid', if paid > 0 -> 'partially_paid', else -> 'unpaid'
      const derivedStatus = derivePaymentStatus({
        customerBilled: inv.customerBilled,
        total: inv.total,
        amount: inv.amount,
        paidAmount: inv.paidAmount,
        remainingAmount: inv.remainingAmount,
        amountOwing: (inv as any).amountOwing,
        owing: (inv as any).owing,
        payments: inv.payments
      });

      // 1. Invoice Default Filter:
      // Ensure unpaid/outstanding invoices display by default without requiring users to toggle "Show Completed/Paid".
      // Only hide if the invoice is genuinely completed/paid in full (owing <= 0).
      if (!showCompleted && derivedStatus === 'paid') {
        return false;
      }

      // 2. Search Query
      const searchLower = searchQuery.toLowerCase();
      const vehicle = vehicles.find(v => v.id === inv.vehicleId);
      
      const matchesSearch =
        !searchQuery ||
        inv.customerName?.toLowerCase().includes(searchLower) ||
        inv.category.toLowerCase().includes(searchLower) ||
        inv.customCategory?.toLowerCase().includes(searchLower) ||
        inv.invoiceNumber?.toLowerCase().includes(searchLower) ||
        inv.vehicleName?.toLowerCase().includes(searchLower) ||
        vehicle?.registrationNumber?.toLowerCase().includes(searchLower);

      // 3. Status filter matching with dynamic status support
      const isOverdue = Boolean(inv.dueDate && new Date() > new Date(inv.dueDate) && derivedStatus !== 'paid');
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'overdue' && isOverdue) ||
        (statusFilter === 'unpaid' && (derivedStatus === 'unpaid' || inv.paymentStatus === 'unpaid' || inv.paymentStatus === 'outstanding')) ||
        (statusFilter === 'partially_paid' && derivedStatus === 'partially_paid') ||
        (statusFilter === 'paid' && derivedStatus === 'paid') ||
        derivedStatus === statusFilter ||
        inv.paymentStatus === statusFilter;

      // 4. Multi-Select Categories
      const matchesCategory = catFilters.includes('all') || catFilters.includes(inv.category);

      // 5. Multi-Select Accounts
      const invAccountTo = (inv as any).accountTo || inv.accountId || '';
      const invAccountFrom = (inv as any).accountFrom || '';
      const matchesAccount = accFilters.includes('all') || 
                             (invAccountTo && accFilters.includes(invAccountTo)) || 
                             (invAccountFrom && accFilters.includes(invAccountFrom)) ||
                             (accFilters.includes('no_account_assigned') && !invAccountTo && !invAccountFrom);

      // 6. Multi-Select Groups
      const invGrp = (inv as any).groupId || '';
      const matchesGroup = grpFilters.includes('all') || 
                           (invGrp && grpFilters.includes(invGrp)) || 
                           (grpFilters.includes('no_group_assigned') && !invGrp);

      // 7. Multi-Select Departments ✅ Added
      const invDept = inv.departmentId || '';
      const matchesDepartment = deptFilters.includes('all') || 
                                (invDept && deptFilters.includes(invDept)) || 
                                (deptFilters.includes('no_department_assigned') && !invDept);

      // 8. Dates
      let matchesDate = true;
      if (dateRange.start || dateRange.end) {
        const rawDate = inv.date;
        const invDateObj = rawDate && (rawDate as any).toDate ? (rawDate as any).toDate() : new Date(rawDate);
        if (!isNaN(invDateObj.getTime())) {
          if (dateRange.start && dateRange.end) {
            matchesDate = isWithinInterval(invDateObj, {
              start: startOfDay(dateRange.start),
              end: endOfDay(dateRange.end),
            });
          } else if (dateRange.start) {
            matchesDate = invDateObj >= startOfDay(dateRange.start);
          } else if (dateRange.end) {
            matchesDate = invDateObj <= endOfDay(dateRange.end);
          }
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesAccount && matchesGroup && matchesDepartment && matchesDate;
    });
  }, [invoices, searchQuery, statusFilter, categoryFilter, accountFilter, groupFilter, departmentFilter, dateRange, vehicles, showCompleted]);

  return {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    categoryFilter, setCategoryFilter,
    accountFilter, setAccountFilter, 
    groupFilter, setGroupFilter, 
    departmentFilter, setDepartmentFilter, // ✅ Extracted
    dateRange, setDateRange,
    showCompleted, setShowCompleted,
    filteredInvoices,
  };
};