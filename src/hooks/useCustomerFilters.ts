import { useState, useMemo } from 'react';
import { Customer, Gender, isExpired } from '../types/customer';
import { addDays } from 'date-fns';

export const useCustomerFilters = (customers: Customer[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpired, setFilterExpired] = useState(false);
  const [filterSoonExpiring, setFilterSoonExpiring] = useState(false);
  const [selectedGender, setSelectedGender] = useState<Gender | 'all'>('all');
  const [ageRange, setAgeRange] = useState<{ min: number; max: number } | null>(null);
  const [sortField, setSortField] = useState<keyof Customer>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredCustomers = useMemo(() => {
    return customers
      .filter(customer => {
        // Search filter
        const matchesSearch = 
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.mobile.includes(searchQuery) ||
          customer.badgeNumber.includes(searchQuery) ||
          customer.driverLicenseNumber.includes(searchQuery);

        // Document expiry filter
        const now = new Date();
        const soonExpiryDate = addDays(now, 30);
        const isSoonExpiring = 
          (customer.licenseExpiry <= soonExpiryDate && customer.licenseExpiry > now) ||
          (customer.billExpiry <= soonExpiryDate && customer.billExpiry > now);

        const passesExpiryFilter = !filterExpired || 
          (!isExpired(customer.licenseExpiry) && !isExpired(customer.billExpiry));

        const passesSoonExpiringFilter = !filterSoonExpiring || isSoonExpiring;

        // Gender filter
        const passesGenderFilter = selectedGender === 'all' || customer.gender === selectedGender;

        // Age filter
        const passesAgeFilter = !ageRange || 
          (customer.age >= ageRange.min && customer.age <= ageRange.max);

        return matchesSearch && 
               passesExpiryFilter && 
               passesSoonExpiringFilter && 
               passesGenderFilter && 
               passesAgeFilter;
      })
      .sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue instanceof Date && bValue instanceof Date) {
          return sortDirection === 'asc' 
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc'
            ? aValue - bValue
            : bValue - aValue;
        }

        return 0;
      });
  }, [
    customers, 
    searchQuery, 
    filterExpired,
    filterSoonExpiring,
    selectedGender,
    ageRange,
    sortField, 
    sortDirection
  ]);

  return {
    searchQuery,
    setSearchQuery,
    filterExpired,
    setFilterExpired,
    filterSoonExpiring,
    setFilterSoonExpiring,
    selectedGender,
    setSelectedGender,
    ageRange,
    setAgeRange,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    filteredCustomers
  };
};