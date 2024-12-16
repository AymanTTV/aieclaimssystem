import { useState, useMemo } from 'react';
import { Accident } from '../types';

export const useAccidentFilters = (accidents: Accident[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fault' | 'non-fault' | 'settled'>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const filteredAccidents = useMemo(() => {
    return accidents.filter(accident => {
      const matchesSearch =
        accident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        accident.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || accident.type === statusFilter;
      const matchesVehicle = !selectedVehicle || accident.vehicleId === selectedVehicle;
      
      return matchesSearch && matchesStatus && matchesVehicle;
    });
  }, [accidents, searchTerm, statusFilter, selectedVehicle]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedVehicle,
    setSelectedVehicle,
    filteredAccidents
  };
};

export default useAccidentFilters;