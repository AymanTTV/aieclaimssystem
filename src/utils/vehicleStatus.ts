import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import toast from 'react-hot-toast';

export const updateVehicleStatus = async (
  vehicleId: string,
  newStatus: Vehicle['status']
) => {
  try {
    await updateDoc(doc(db, 'vehicles', vehicleId), {
      status: newStatus,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    toast.error('Failed to update vehicle status');
    return false;
  }
};

export const isVehicleAvailable = (vehicle: Vehicle): boolean => {
  return vehicle.status === 'active' || vehicle.status === 'available';
};