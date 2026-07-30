// src/hooks/useCustomerFilters.ts
import { useState, useMemo } from 'react';
import { Customer, Gender, CustomerType, isExpired, isExpiringSoon } from '../types/customer';

export const useCustomerFilters = (customers: Customer[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expiryFilters, setExpiryFilters] = useState<string[]>(['all']); 
  const [selectedGender, setSelectedGender] = useState<Gender | 'all'>('all');
  const [ageRange, setAgeRange] = useState<{ min: number; max: number } | null>(null);
  const [selectedType, setSelectedType] = useState<CustomerType | 'all'>('customer');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  
  // [NEW] Bill Copy Filter
  const [billCopyFilter, setBillCopyFilter] = useState<'available' | 'unavailable' | 'all'>('all');

  const filteredCustomers = useMemo(() => {
    const filtered = customers.filter(customer => {
      // 1. Search filter
      const searchLower = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower) ||
        customer.mobile.includes(searchLower) ||
        (customer.accountNumber && customer.accountNumber.toLowerCase().includes(searchLower)) ||
        (customer.badgeNumber && customer.badgeNumber.toLowerCase().includes(searchLower)) ||
        (customer.driverLicenseNumber && customer.driverLicenseNumber.toLowerCase().includes(searchLower)) ||
        (customer.nationalInsuranceNumber && customer.nationalInsuranceNumber.toLowerCase().includes(searchLower));

      // 2. Status Filter
      const custStatus = customer.status || 'active';
      const passesStatusFilter = (() => {
        if (statusFilter === 'all') return true;
        if (searchLower.length > 0) return true; // Search overrides hide
        return custStatus === statusFilter;
      })();

      // 3. Document Expiry Logic
      const hasExpired = isExpired(customer.licenseExpiry) || isExpired(customer.billExpiry);
      const hasSoonLicense = isExpiringSoon(customer.licenseExpiry);
      const hasSoonBill = isExpiringSoon(customer.billExpiry);

      const passesExpiryFilter = (() => {
        if (expiryFilters.includes('all') || expiryFilters.length === 0) return true;
        if (expiryFilters.includes('hide_expired') && hasExpired) return false;
        if (expiryFilters.includes('already_expired') && !hasExpired) return false;

        const wantsSoonAll = expiryFilters.includes('soon_all');
        const wantsSoonLicense = expiryFilters.includes('soon_license');
        const wantsSoonBill = expiryFilters.includes('soon_bill');

        if (wantsSoonAll || wantsSoonLicense || wantsSoonBill) {
          let matchesSoon = false;
          if (wantsSoonAll && (hasSoonLicense || hasSoonBill)) matchesSoon = true;
          if (wantsSoonLicense && hasSoonLicense) matchesSoon = true;
          if (wantsSoonBill && hasSoonBill) matchesSoon = true;
          if (!matchesSoon) return false;
        }

        return true;
      })();

      // 4. [NEW] Bill Copy Filter Logic
      const passesBillCopyFilter = (() => {
        if (billCopyFilter === 'all') return true;
        // If undefined, treat as unavailable
        const currentBillStatus = customer.billCopyStatus || 'unavailable';
        return currentBillStatus === billCopyFilter;
      })();

      // 5. Other Filters
      const passesGenderFilter = selectedGender === 'all' || customer.gender === selectedGender;
      const passesAgeFilter = !ageRange || (customer.age !== undefined && customer.age >= ageRange.min && customer.age <= ageRange.max);
      const passesTypeFilter = selectedType === 'all' ? true : 
        (selectedType === 'customer' ? (customer.type === 'customer' || !customer.type) : customer.type === selectedType);

      return matchesSearch && passesStatusFilter && passesExpiryFilter && passesBillCopyFilter && passesGenderFilter && passesAgeFilter && passesTypeFilter;
    });

    // Sort: Soon expiring at the top
    return filtered.sort((a, b) => {
      const aExpiringSoon = isExpiringSoon(a.licenseExpiry) || isExpiringSoon(a.billExpiry);
      const bExpiringSoon = isExpiringSoon(b.licenseExpiry) || isExpiringSoon(b.billExpiry);

      if (aExpiringSoon && !bExpiringSoon) return -1;
      if (!aExpiringSoon && bExpiringSoon) return 1;
      return 0;
    });

  }, [customers, searchQuery, expiryFilters, statusFilter, billCopyFilter, selectedGender, ageRange, selectedType]);

  return {
    searchQuery, setSearchQuery,
    expiryFilters, setExpiryFilters,
    statusFilter, setStatusFilter,
    billCopyFilter, setBillCopyFilter, // [NEW]
    selectedGender, setSelectedGender,
    ageRange, setAgeRange,
    selectedType, setSelectedType,
    filteredCustomers
  };
};