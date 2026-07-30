// src/hooks/useRentalFilters.ts
import { useState, useMemo } from 'react';
import { Rental, Vehicle, Customer } from '../types';

export const useRentalFilters = (
  rentals: Rental[] = [],
  vehicles: Vehicle[] = [],
  customers: Customer[] = []
) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use arrays for multi-select support, defaulting to ['all']
  const [statusFilter, setStatusFilter] = useState<string[]>(['all']);
  const [typeFilter, setTypeFilter] = useState<string[]>(['all']);
  const [vehicleFilter, setVehicleFilter] = useState<string[]>(['all']);
  const [reasonFilter, setReasonFilter] = useState<string[]>(['all']);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string[]>(['all']);
  
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      const searchLower = searchQuery.trim().toLowerCase();
      const searchNoSpaces = searchLower.replace(/\s+/g, '');

      // Lookup related vehicle & customer
      const vehicle = vehicles.find(v => v.id === rental.vehicleId);
      const customer = customers.find(c => c.id === rental.customerId);

      // --- TEXT SEARCH LOGIC ---
      let matchesSearch = true;
      if (searchLower) {
        const matchesVehicle = vehicle
          ? (`${vehicle.make} ${vehicle.model}`).toLowerCase().includes(searchLower) || 
            (vehicle.registrationNumber || '').toLowerCase().replace(/\s+/g, '').includes(searchNoSpaces)
          : false;
          
        const matchesCustomer = customer
          ? (`${customer.name} ${customer.mobile} ${customer.email}`).toLowerCase().includes(searchLower)
          : false;
          
        const matchesBasic =
          rental.id.toLowerCase().includes(searchLower) ||
          rental.reason.toLowerCase().includes(searchLower) ||
          rental.type.toLowerCase().includes(searchLower) ||
          rental.status.toLowerCase().includes(searchLower) ||
          (rental.rentalAgreementNumber && rental.rentalAgreementNumber.toLowerCase().includes(searchLower));

        // Search through all substitutions
        const subs = rental.hireSubstitutionDetails || [];
        const matchesSubs = subs.some(sub =>
          (sub.registration || '').toLowerCase().replace(/\s+/g, '').includes(searchNoSpaces) ||
          (`${sub.make || ''} ${sub.model || ''}`).toLowerCase().includes(searchLower) ||
          (sub.loaner || '').toLowerCase().includes(searchLower)
        );

        matchesSearch = !!(matchesVehicle || matchesCustomer || matchesBasic || matchesSubs);
      }

      // --- MULTI-SELECT ARRAY LOGIC ---
      const matchesStatus = statusFilter.includes('all') || statusFilter.includes(rental.status);
      const matchesType = typeFilter.includes('all') || typeFilter.includes(rental.type);
      
      // ✅ NEW: Advanced Vehicle Filter matching Substitutions
      let matchesVehicleSelect = vehicleFilter.includes('all');
      if (!matchesVehicleSelect) {
        matchesVehicleSelect = vehicleFilter.some(filterId => {
          // 1. Direct match on main rental vehicle
          if (filterId === rental.vehicleId) return true;
          
          const subs = rental.hireSubstitutionDetails || [];
          
          // 2. Match if the user selected an EXTERNAL substitution vehicle (starts with 'sub_')
          if (filterId.startsWith('sub_')) {
            const targetReg = filterId.replace('sub_', '');
            return subs.some(sub => (sub.registration || '').toLowerCase().replace(/\s+/g, '') === targetReg);
          }
          
          // 3. Match if the user selected a FLEET vehicle that was used as a substitution here
          const selectedV = vehicles.find(v => v.id === filterId);
          if (selectedV) {
            const targetReg = (selectedV.registrationNumber || '').toLowerCase().replace(/\s+/g, '');
            return subs.some(sub => (sub.registration || '').toLowerCase().replace(/\s+/g, '') === targetReg);
          }
          
          return false;
        });
      }
      
      // Handle reason logic identical to table display
      let displayReason = rental.reason;
      if (displayReason === 'h-substitute') {
          const subs = rental.hireSubstitutionDetails || [];
          const hasActiveSub = subs.some(s => !s.returnCondition);
          if (subs.length > 0 && !hasActiveSub) {
              displayReason = 'hired' as any;
          }
      }
      const matchesReason = reasonFilter.includes('all') || reasonFilter.includes(displayReason);

      let matchesPaymentStatus = true;
      if (!paymentStatusFilter.includes('all')) {
        const currentStatus = rental.paymentStatus || 'pending';
        matchesPaymentStatus = paymentStatusFilter.includes(currentStatus);
      }

      // --- DATE RANGE LOGIC ---
      let matchesDateRange = true;
      if (startDateFilter || endDateFilter) {
        const rentalStartMs = rental.startDate instanceof Date
          ? rental.startDate.getTime()
          : (rental.startDate as any)?.toDate?.().getTime() || null;
        const rentalEndMs = rental.endDate instanceof Date
          ? rental.endDate.getTime()
          : (rental.endDate as any)?.toDate?.().getTime() || null;

        const filterStartMs = startDateFilter ? new Date(startDateFilter).getTime() : null;
        const filterEndMs   = endDateFilter   ? new Date(`${endDateFilter}T23:59:59.999`).getTime() : null;

        const effectiveFilterStartMs = filterStartMs ?? new Date('1900-01-01T00:00:00Z').getTime();
        const effectiveFilterEndMs   = filterEndMs   ?? new Date('2100-12-31T23:59:59.999Z').getTime();

        if (rentalStartMs !== null && rentalEndMs !== null) {
          // Overlap logic: Rental starts before the filter ends AND ends after the filter starts
          matchesDateRange =
            rentalStartMs <= effectiveFilterEndMs &&
            rentalEndMs >= effectiveFilterStartMs;
        } else if (rentalStartMs !== null) {
          matchesDateRange =
            rentalStartMs <= effectiveFilterEndMs &&
            rentalStartMs >= effectiveFilterStartMs;
        } else if (rentalEndMs !== null) {
          matchesDateRange =
            rentalEndMs <= effectiveFilterEndMs &&
            rentalEndMs >= effectiveFilterStartMs;
        } else {
          matchesDateRange = false;
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesVehicleSelect &&
        matchesReason &&
        matchesPaymentStatus &&
        matchesDateRange
      );
    });
  }, [
    rentals,
    vehicles,
    customers,
    searchQuery,
    statusFilter,
    typeFilter,
    vehicleFilter,
    reasonFilter,
    paymentStatusFilter,
    startDateFilter,
    endDateFilter,
  ]);

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    reasonFilter,
    setReasonFilter,
    paymentStatusFilter, 
    setPaymentStatusFilter, 
    startDateFilter,
    setStartDateFilter,
    endDateFilter,
    setEndDateFilter,
    filteredRentals,
  };
};