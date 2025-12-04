// src/hooks/useShareFilters.ts

import { useState, useMemo } from 'react';
import { ShareRecord } from '../types/share';

export const useShareFilters = (records: ShareRecord[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [progressFilter, setProgressFilter] = useState<
    'all' | 'in-progress' | 'completed'
  >('all');
  
  // -- NEW STATE --
  const [recurringFilter, setRecurringFilter] = useState<string>('all');
  // ---------------

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const matchesSearch =
        rec.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesReason =
        selectedReasons.length === 0 ||
        selectedReasons.every(r => rec.reason.includes(r)); 
      const matchesProgress =
        progressFilter === 'all' || rec.progress === progressFilter;
      
      // -- RECURRING LOGIC --
      let matchesRecurring = true;
      if (recurringFilter === 'all') {
          matchesRecurring = true;
      } else if (recurringFilter === 'non_recurring') {
          matchesRecurring = !rec.isRecurring;
      } else if (recurringFilter === 'recurring_all') {
          matchesRecurring = !!rec.isRecurring;
      } else if (recurringFilter.startsWith('recurring_')) {
          const targetFreq = recurringFilter.replace('recurring_', '');
          matchesRecurring = !!rec.isRecurring && rec.recurringFrequency === targetFreq;
      }
      // ---------------------

      return matchesSearch && matchesReason && matchesProgress && matchesRecurring;
    });
  }, [records, searchQuery, selectedReasons, progressFilter, recurringFilter]);

  return {
    searchQuery,
    setSearchQuery,
    selectedReasons,
    setSelectedReasons,
    progressFilter,
    setProgressFilter,
    recurringFilter,    // Return
    setRecurringFilter, // Return
    filteredRecords,
  };
};