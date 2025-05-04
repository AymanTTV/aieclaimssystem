// src/hooks/useShareFilters.ts

import { useState, useMemo } from 'react';
import { ShareRecord } from '../types/share';

export const useShareFilters = (records: ShareRecord[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [progressFilter, setProgressFilter] = useState<
    'all' | 'in-progress' | 'completed'
  >('all');

  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      const matchesSearch =
        rec.clientName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesReason =
        selectedReasons.length === 0 ||
        selectedReasons.every(r => rec.reason.includes(r));
      const matchesProgress =
        progressFilter === 'all' || rec.progress === progressFilter;

      return matchesSearch && matchesReason && matchesProgress;
    });
  }, [records, searchQuery, selectedReasons, progressFilter]);

  return {
    searchQuery,
    setSearchQuery,
    selectedReasons,
    setSelectedReasons,
    progressFilter,
    setProgressFilter,
    filteredRecords,
  };
};
