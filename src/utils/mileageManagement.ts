import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import toast from 'react-hot-toast';

export const updateVehicleMileage = async (
  vehicle: Vehicle,
  newMileage: number,
  recordedBy: string,
  notes?: string
) => {
  try {
    if (newMileage < vehicle.mileage) {
      throw new Error('New mileage cannot be less than current mileage');
    }

    await addDoc(collection(db, 'mileageHistory'), {
      vehicleId: vehicle.id,
      previousMileage: vehicle.mileage,
      newMileage,
      date: new Date(),
      recordedBy,
      notes: notes || 'Mileage update'
    });

    await updateDoc(doc(db, 'vehicles', vehicle.id), {
      mileage: newMileage,
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error updating mileage:', error);
    toast.error('Failed to update mileage');
    return false;
  }
};