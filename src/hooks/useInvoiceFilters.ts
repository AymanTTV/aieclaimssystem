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
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        // Search by invoice number
        `AIE-INV-${invoice.id.slice(-8)}`.toLowerCase().includes(searchLower) ||
        // Search by customer name (both direct and through customerId)
        (invoice.customerName?.toLowerCase().includes(searchLower) || 
         customers?.find(c => c.id === invoice.customerId)?.name.toLowerCase().includes(searchLower)) ||
        // Search by category
        invoice.category.toLowerCase().includes(searchLower) ||
        // Search by description
        invoice.description.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || invoice.paymentStatus === statusFilter;

      // Category filter
      const matchesCategory = categoryFilter === 'all' || invoice.category === categoryFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRange.start && dateRange.end) {
        matchesDateRange = isWithinInterval(invoice.date, {
          start: dateRange.start,
          end: dateRange.end
        });
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesDateRange;
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
