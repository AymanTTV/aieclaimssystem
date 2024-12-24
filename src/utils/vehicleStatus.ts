import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle, VehicleStatus } from '../types';
import toast from 'react-hot-toast';

export const updateVehicleStatus = async (
  vehicleId: string,
  newStatus: VehicleStatus,
  referenceId?: string,
  referenceType?: 'rental' | 'maintenance' | 'test'
) => {
  try {
    const updates: Partial<Vehicle> = {
      status: newStatus,
      currentRental: null,
      currentMaintenance: null,
      currentTest: null,
    };

    if (referenceId && referenceType) {
      updates[`current${referenceType.charAt(0).toUpperCase() + referenceType.slice(1)}`] = referenceId;
    }

    await updateDoc(doc(db, 'vehicles', vehicleId), updates);
    return true;
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    toast.error('Failed to update vehicle status');
    return false;
  }
};

export const checkVehicleConflicts = async (
  vehicleId: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> => {
  // Check for existing rentals or maintenance in the given period
  const rentalsQuery = query(
    collection(db, 'rentals'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['scheduled', 'active']),
    where('startDate', '<=', endDate),
    where('endDate', '>=', startDate)
  );

  const maintenanceQuery = query(
    collection(db, 'maintenanceLogs'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['scheduled', 'in-progress']),
    where('date', '<=', endDate),
    where('date', '>=', startDate)
  );

  const [rentalDocs, maintenanceDocs] = await Promise.all([
    getDocs(rentalsQuery),
    getDocs(maintenanceQuery)
  ]);

  return rentalDocs.empty && maintenanceDocs.empty;
};