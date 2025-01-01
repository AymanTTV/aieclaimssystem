import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';

export const updateVehicleStatus = async (vehicleId: string, status: Vehicle['status']) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      status,
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    return false;
  }
};

export const checkVehicleStatus = async (vehicleId: string): Promise<Vehicle['status']> => {
  // Check rentals
  const rentalsQuery = query(
    collection(db, 'rentals'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['active', 'scheduled'])
  );
  const rentalDocs = await getDocs(rentalsQuery);
  
  if (!rentalDocs.empty) {
    const rental = rentalDocs.docs[0].data();
    return rental.status === 'active' ? 'rented' : 'scheduled-rental';
  }

  // Check maintenance
  const maintenanceQuery = query(
    collection(db, 'maintenanceLogs'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['scheduled', 'in-progress'])
  );
  const maintenanceDocs = await getDocs(maintenanceQuery);

  if (!maintenanceDocs.empty) {
    const maintenance = maintenanceDocs.docs[0].data();
    return maintenance.status === 'in-progress' ? 'maintenance' : 'scheduled-maintenance';
  }

  // Default to available
  return 'available';
};