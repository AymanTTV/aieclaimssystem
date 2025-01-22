import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';

export const checkAndUpdateVehicleStatus = async (vehicleId: string) => {
  try {
    // Check active rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('vehicleId', '==', vehicleId),
      where('status', 'in', ['active', 'scheduled'])
    );
    const rentalDocs = await getDocs(rentalsQuery);

    // Check maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('vehicleId', '==', vehicleId),
      where('status', 'in', ['in-progress', 'scheduled'])
    );
    const maintenanceDocs = await getDocs(maintenanceQuery);

    // Determine active statuses
    const activeStatuses: string[] = [];

    rentalDocs.forEach(doc => {
      const rental = doc.data();
      if (rental.status === 'active') {
        activeStatuses.push('hired');
      } else if (rental.status === 'scheduled') {
        activeStatuses.push('scheduled-rental');
      }
    });

    maintenanceDocs.forEach(doc => {
      const maintenance = doc.data();
      if (maintenance.status === 'in-progress') {
        activeStatuses.push('maintenance');
      } else if (maintenance.status === 'scheduled') {
        activeStatuses.push('scheduled-maintenance');
      }
    });

    // Update vehicle status
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      status: getEffectiveStatus(activeStatuses),
      activeStatuses,
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Error checking vehicle status:', error);
  }
};

// Helper function to determine effective status
const getEffectiveStatus = (statuses: string[]): Vehicle['status'] => {
  if (statuses.includes('maintenance')) return 'maintenance';
  if (statuses.includes('hired')) return 'hired';
  if (statuses.includes('scheduled-maintenance')) return 'scheduled-maintenance';
  if (statuses.includes('scheduled-rental')) return 'scheduled-rental';
  if (statuses.includes('claim')) return 'claim';
  if (statuses.includes('sold')) return 'sold';
  if (statuses.includes('unavailable')) return 'unavailable';
  return 'available';
};