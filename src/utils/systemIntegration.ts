import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';

export const updateRelatedRecords = async (vehicleId: string, updates: Partial<Vehicle>) => {
  const batch = db.batch();

  // Update rentals if status changed
  if (updates.status === 'unavailable') {
    const rentalsRef = collection(db, 'rentals');
    const q = query(rentalsRef, where('vehicleId', '==', vehicleId), where('status', '==', 'scheduled'));
    const rentals = await getDocs(q);
    
    rentals.forEach(rental => {
      batch.update(rental.ref, { status: 'cancelled', cancellationReason: 'Vehicle unavailable' });
    });
  }

  // Update maintenance records if sold
  if (updates.status === 'sold') {
    const maintenanceRef = collection(db, 'maintenanceLogs');
    const q = query(maintenanceRef, where('vehicleId', '==', vehicleId), where('status', '==', 'scheduled'));
    const maintenance = await getDocs(q);
    
    maintenance.forEach(record => {
      batch.update(record.ref, { status: 'cancelled', cancellationReason: 'Vehicle sold' });
    });
  }

  await batch.commit();
};

export const createFinanceRecord = async (vehicleId: string, amount: number, type: 'sale' | 'maintenance' | 'rental') => {
  await addDoc(collection(db, 'transactions'), {
    vehicleId,
    amount,
    type,
    date: new Date(),
    status: 'completed'
  });
};