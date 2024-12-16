import { useState } from 'react';
import { Vehicle } from '../types';

export const useVehicleActions = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [sellingVehicle, setSellingVehicle] = useState<Vehicle | null>(null);
  const [undoingVehicle, setUndoingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);

  const resetAllModals = () => {
    setSelectedVehicle(null);
    setEditingVehicle(null);
    setSellingVehicle(null);
    setUndoingVehicle(null);
    setDeletingVehicle(null);
  };

  return {
    selectedVehicle,
    setSelectedVehicle,
    editingVehicle,
    setEditingVehicle,
    sellingVehicle,
    setSellingVehicle,
    undoingVehicle,
    setUndoingVehicle,
    deletingVehicle,
    setDeletingVehicle,
    resetAllModals,
  };
};