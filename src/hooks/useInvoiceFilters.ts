import { useState, useMemo } from 'react';
import { Invoice } from '../types';
import { isWithinInterval } from 'date-fns';

export const useInvoiceFilters = (invoices: Invoice[]) => {
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
        invoice.description.toLowerCase().includes(searchLower) ||
        invoice.category.toLowerCase().includes(searchLower);

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
  }, [invoices, searchQuery, statusFilter, categoryFilter, dateRange]);

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
