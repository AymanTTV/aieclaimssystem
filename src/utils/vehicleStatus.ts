import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

export const checkVehicleAvailability = async (vehicleId: string): Promise<boolean> => {
  // Check for scheduled or active rentals
  const rentalsQuery = query(
    collection(db, 'rentals'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['scheduled', 'active'])
  );
  const rentalDocs = await getDocs(rentalsQuery);
  if (!rentalDocs.empty) return false;

  // Check for scheduled or in-progress maintenance
  const maintenanceQuery = query(
    collection(db, 'maintenanceLogs'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['scheduled', 'in-progress'])
  );
  const maintenanceDocs = await getDocs(maintenanceQuery);
  if (!maintenanceDocs.empty) return false;

  return true;
};

export const getVehicleStatus = async (vehicleId: string): Promise<Vehicle['status']> => {
  // Check rentals first
  const rentalsQuery = query(
    collection(db, 'rentals'),
    where('vehicleId', '==', vehicleId),
    where('status', 'in', ['scheduled', 'active'])
  );
  const rentalDocs = await getDocs(rentalsQuery);
  
  if (!rentalDocs.empty) {
    const rental = rentalDocs.docs[0].data();
    return rental.status === 'active' ? 'rented' : 'scheduled-rental';
  }

  // Then check maintenance
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

  return 'available';
};