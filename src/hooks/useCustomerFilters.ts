import { useState, useMemo } from 'react';
import { Customer, Gender, isExpired } from '../types/customer';
import { addDays } from 'date-fns';

export const useCustomerFilters = (customers: Customer[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpired, setFilterExpired] = useState(false);
  const [filterSoonExpiring, setFilterSoonExpiring] = useState(false);
  const [selectedGender, setSelectedGender] = useState<Gender | 'all'>('all');
  const [ageRange, setAgeRange] = useState<{ min: number; max: number } | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.mobile.includes(searchLower) ||
        customer.badgeNumber.includes(searchLower) ||
        customer.driverLicenseNumber.includes(searchLower) ||
        customer.nationalInsuranceNumber.includes(searchLower);

      // Document expiry filter
      const now = new Date();
      const warningDate = addDays(now, 30);
      
      // Check for expired documents
      const hasExpiredDocuments = 
        isExpired(customer.licenseExpiry) || 
        isExpired(customer.billExpiry);

      // Check for soon expiring documents
      const hasSoonExpiringDocuments = 
        (!isExpired(customer.licenseExpiry) && customer.licenseExpiry <= warningDate) ||
        (!isExpired(customer.billExpiry) && customer.billExpiry <= warningDate);

      // Apply filters
      const passesExpiryFilter = !filterExpired || !hasExpiredDocuments;
      const passesSoonExpiringFilter = !filterSoonExpiring || hasSoonExpiringDocuments;

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
    });
  }, [
    customers, 
    searchQuery, 
    filterExpired,
    filterSoonExpiring,
    selectedGender,
    ageRange
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
    filteredCustomers
  };
};
