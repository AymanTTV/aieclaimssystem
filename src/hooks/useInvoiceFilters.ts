// src/hooks/useInvoiceFilters.ts
import { useState, useMemo } from 'react';
import { Invoice, Vehicle } from '../types/finance';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

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
      // 1. Hide Completed Logic
      if (!showCompleted && inv.paymentStatus === 'paid') {
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

      // 3. Status
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'overdue' &&
          (inv.paymentStatus === 'pending' || inv.paymentStatus === 'partially_paid' || inv.paymentStatus === 'unpaid') &&
          new Date() > new Date(inv.dueDate)) ||
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
      if (dateRange.start && dateRange.end) {
        matchesDate = isWithinInterval(new Date(inv.date), {
          start: startOfDay(dateRange.start),
          end: endOfDay(dateRange.end),
        });
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