import { useState, useMemo } from 'react';
import { Transaction, Vehicle } from '../types';
import { isWithinInterval } from 'date-fns';

export const useFinanceFilters = (transactions: Transaction[] = [], vehicles: Vehicle[] = []) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [category, setCategory] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'paid' | 'unpaid' | 'partially_paid'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState(''); // Added customer state
  const [selectedOwner, setSelectedOwner] = useState('all');

  const owners = useMemo(() => {
    const ownerSet = new Set<string>();
    vehicles.forEach(vehicle => {
      if (vehicle.owner && !vehicle.owner.isDefault) {
        ownerSet.add(vehicle.owner.name);
      }
    });
    return Array.from(ownerSet);
  }, [vehicles]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const searchLower = searchQuery.toLowerCase();
      const vehicle = vehicles.find(v => v.id === transaction.vehicleId);

      const matchesSearch =
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.category.toLowerCase().includes(searchLower) ||
        transaction.paymentReference?.toLowerCase().includes(searchLower) ||
        transaction.customerName?.toLowerCase().includes(searchLower) ||
        transaction.vehicleName?.toLowerCase().includes(searchLower) ||
        vehicle?.registrationNumber?.toLowerCase().includes(searchLower) ||
        false;

      const matchesType = type === 'all' || transaction.type === type;
      const matchesCategory = category === 'all' || transaction.category.toLowerCase() === category.toLowerCase();
      const matchesPaymentStatus = paymentStatus === 'all' || transaction.paymentStatus === paymentStatus;
      const matchesCustomer = !selectedCustomerId || transaction.customerId === selectedCustomerId; // Added customer filter
      const matchesOwner = selectedOwner === 'all' ||
        (selectedOwner === 'company' && (!transaction.vehicleOwner || transaction.vehicleOwner.isDefault)) ||
        (transaction.vehicleOwner && transaction.vehicleOwner.name === selectedOwner);

      let matchesDateRange = true;
      if (startDate && endDate) {
        matchesDateRange = isWithinInterval(transaction.date, { start: startDate, end: endDate });
      }

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesPaymentStatus &&
        matchesCustomer && // Added customer filter
        matchesOwner &&
        matchesDateRange
      );
    }).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions, searchQuery, type, category, paymentStatus, selectedOwner, startDate, endDate, vehicles, selectedCustomerId]); // Added selectedCustomerId to dependency array

  const setDateRange = (range: { start: Date | null; end: Date | null }) => {
    setStartDate(range.start);
    setEndDate(range.end);
  };

  return {
    searchQuery,
    setSearchQuery,
    type,
    setType,
    category,
    setCategory,
    paymentStatus,
    setPaymentStatus,
    dateRange: { start: startDate, end: endDate },
    setDateRange,
    selectedCustomerId, // Added customer state
    setSelectedCustomerId, // Added customer state
    selectedOwner,
    setSelectedOwner,
    owners,
    filteredTransactions,
  };
};