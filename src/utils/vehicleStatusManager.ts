import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VehicleStatus } from '../types';
import toast from 'react-hot-toast';

export const updateVehicleStatus = async (vehicleId: string, status: VehicleStatus) => {
  try {
    await updateDoc(doc(db, 'vehicles', vehicleId), {
      status,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    toast.error('Failed to update vehicle status');
    return false;
  }
};

export const validateStatusChange = (currentStatus: VehicleStatus, newStatus: VehicleStatus): boolean => {
  // Prevent changing status of sold vehicles
  if (currentStatus === 'sold') return false;

  // Prevent renting vehicles in maintenance
  if (currentStatus === 'maintenance' && newStatus === 'rented') return false;

  return true;
};