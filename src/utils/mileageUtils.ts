import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import toast from 'react-hot-toast';

export const createMileageHistoryRecord = async (
  vehicle: Vehicle,
  newMileage: number,
  recordedBy: string,
  notes?: string
) => {
  try {
    if (newMileage === vehicle.mileage) {
      return { success: true };
    }

    if (newMileage < vehicle.mileage) {
      toast.error('New mileage cannot be less than current mileage');
      return { success: false };
    }

    // Create mileage history record
    await addDoc(collection(db, 'mileageHistory'), {
      vehicleId: vehicle.id,
      previousMileage: vehicle.mileage,
      newMileage,
      date: new Date(),
      recordedBy,
      notes: notes || 'Mileage update'
    });

    // Update vehicle mileage
    await updateDoc(doc(db, 'vehicles', vehicle.id), {
      mileage: newMileage,
      updatedAt: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating mileage history:', error);
    toast.error('Failed to record mileage history');
    return { success: false, error };
  }
};

export const validateMileageUpdate = (currentMileage: number, newMileage: number): boolean => {
  if (newMileage < currentMileage) {
    toast.error('New mileage cannot be less than current mileage');
    return false;
  }
  return true;
};