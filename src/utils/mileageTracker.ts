import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import toast from 'react-hot-toast';

export const updateMileage = async (
  vehicle: Vehicle,
  newMileage: number,
  recordedBy: string,
  notes?: string
) => {
  try {
    if (newMileage <= vehicle.mileage) {
      throw new Error('New mileage must be greater than current mileage');
    }

    // Create mileage history record
    await addDoc(collection(db, 'mileageHistory'), {
      vehicleId: vehicle.id,
      previousMileage: vehicle.mileage,
      newMileage,
      date: new Date(),
      recordedBy,
      notes
    });

    // Update vehicle mileage
    await updateDoc(doc(db, 'vehicles', vehicle.id), {
      mileage: newMileage,
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error updating mileage:', error);
    toast.error(error.message || 'Failed to update mileage');
    return false;
  }
};