// src/hooks/useCustomerFilters.ts
import { useState, useMemo } from 'react';
import { Customer, Gender, CustomerType, isExpired } from '../types/customer';
import { addDays } from 'date-fns';

export const useCustomerFilters = (customers: Customer[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpired, setFilterExpired] = useState(false);
  const [filterSoonExpiring, setFilterSoonExpiring] = useState(false);
  const [selectedGender, setSelectedGender] = useState<Gender | 'all'>('all');
  const [ageRange, setAgeRange] = useState<{ min: number; max: number } | null>(null);
  const [selectedType, setSelectedType] = useState<CustomerType | 'all'>('all');

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.mobile.includes(searchLower) ||
        (customer.accountNumber && customer.accountNumber.toLowerCase().includes(searchLower)) || // Added Account Number Search
        (customer.badgeNumber && customer.badgeNumber.includes(searchLower)) ||
        (customer.driverLicenseNumber && customer.driverLicenseNumber.includes(searchLower)) ||
        (customer.nationalInsuranceNumber && customer.nationalInsuranceNumber.includes(searchLower));

      // Document expiry filter
      const now = new Date();
      const warningDate = addDays(now, 30);
      
      const hasExpiredDocuments = 
        (customer.licenseExpiry && isExpired(customer.licenseExpiry)) || 
        (customer.billExpiry && isExpired(customer.billExpiry));

      const hasSoonExpiringDocuments = 
        (customer.licenseExpiry && !isExpired(customer.licenseExpiry) && customer.licenseExpiry <= warningDate) ||
        (customer.billExpiry && !isExpired(customer.billExpiry) && customer.billExpiry <= warningDate);

      // Apply filters
      const passesExpiryFilter = !filterExpired || !hasExpiredDocuments;
      const passesSoonExpiringFilter = !filterSoonExpiring || hasSoonExpiringDocuments;
      const passesGenderFilter = selectedGender === 'all' || customer.gender === selectedGender;
      const passesAgeFilter = !ageRange || 
        (customer.age !== undefined && customer.age >= ageRange.min && customer.age <= ageRange.max);

      // Type filter
      const passesTypeFilter = (() => {
        if (selectedType === 'all') {
          return true;
        }
        if (selectedType === 'customer') {
          // Show if type is 'customer' or if type is missing (for older records)
          return customer.type === 'customer' || !customer.type;
        }
        // For other specific types like 'claim' or 'company'
        return customer.type === selectedType;
      })();

      return matchesSearch && 
             passesExpiryFilter && 
             passesSoonExpiringFilter && 
             passesGenderFilter && 
             passesAgeFilter &&
             passesTypeFilter;
    });
  }, [
    customers, 
    searchQuery, 
    filterExpired,
    filterSoonExpiring,
    selectedGender,
    ageRange,
    selectedType
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
    selectedType,
    setSelectedType,
    filteredCustomers
  };
};