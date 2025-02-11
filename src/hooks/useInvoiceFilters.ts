// src/hooks/useInvoiceFilters.ts

import { useState, useMemo } from 'react';
import { Invoice, Customer } from '../types';
import { isWithinInterval } from 'date-fns';

export const useInvoiceFilters = (invoices: Invoice[], customers?: Customer[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const searchLower = searchQuery.toLowerCase();

      const matchesCustomerName =
        (invoice.customerName?.toLowerCase().includes(searchLower)) ||
        (invoice.customerId && customers?.find(c => c.id === invoice.customerId)?.name?.toLowerCase().includes(searchLower));

      const matchesInvoiceNumber = `AIE-INV-${invoice.id.slice(-8)}`.toLowerCase().includes(searchLower);

      const matchesCategorySearch =
        invoice.category.toLowerCase().includes(searchLower) ||
        invoice.customCategory?.toLowerCase().includes(searchLower);

      // *** CORRECTED LOGIC HERE ***
      const matchesSearch = searchQuery === "" || (matchesCustomerName || matchesInvoiceNumber || matchesCategorySearch);

      const matchesStatus = statusFilter === 'all' || invoice.paymentStatus === statusFilter;
      const matchesCategoryFilter = categoryFilter === 'all' || invoice.category === categoryFilter;

      let matchesDateRange = true;
      if (dateRange.start && dateRange.end) {
        matchesDateRange = isWithinInterval(invoice.date, { start: dateRange.start, end: dateRange.end });
      }

      return matchesSearch && matchesStatus && matchesCategoryFilter && matchesDateRange;
    }).sort((a, b) => {
      // Sort by overdue status first, then by due date
      const aOverdue = a.paymentStatus !== 'paid' && new Date() > a.dueDate;
      const bOverdue = b.paymentStatus !== 'paid' && new Date() > b.dueDate;
      
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }, [invoices, customers, searchQuery, statusFilter, categoryFilter, dateRange]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    filteredInvoices
  };
};
