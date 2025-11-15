// src/hooks/useInvoiceFilters.ts
import { useState, useMemo, useEffect } from 'react';
import { Invoice, Vehicle } from '../types/finance'; // Import Vehicle
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export const useInvoiceFilters = (
  invoices: Invoice[] = [],
  vehicles: Vehicle[] = [] // <-- ADDED
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const searchLower = searchQuery.toLowerCase();
      const vehicle = vehicles.find(v => v.id === inv.vehicleId); // <-- ADDED
      
      const matchesSearch =
        !searchQuery ||
        inv.customerName?.toLowerCase().includes(searchLower) ||
        inv.category.toLowerCase().includes(searchLower) ||
        inv.customCategory?.toLowerCase().includes(searchLower) ||
        inv.invoiceNumber?.toLowerCase().includes(searchLower) ||
        inv.vehicleName?.toLowerCase().includes(searchLower) || // <-- ADDED
        vehicle?.registrationNumber?.toLowerCase().includes(searchLower); // <-- ADDED

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'overdue' &&
          (inv.paymentStatus === 'pending' || inv.paymentStatus === 'partially_paid' || inv.paymentStatus === 'unpaid') &&
          new Date() > new Date(inv.dueDate)) ||
        inv.paymentStatus === statusFilter;

      const matchesCategory = categoryFilter === 'all' || inv.category === categoryFilter;

      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
        matchesDate = isWithinInterval(new Date(inv.date), {
          start: startOfDay(dateRange.start),
          end: endOfDay(dateRange.end),
        });
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });
  }, [invoices, searchQuery, statusFilter, categoryFilter, dateRange, vehicles]); // <-- ADDED vehicles

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    filteredInvoices,
  };
};