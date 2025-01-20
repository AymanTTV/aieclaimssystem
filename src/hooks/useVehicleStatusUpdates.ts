import { useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useVehicleStatusUpdates = () => {
  useEffect(() => {
    // Monitor rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['scheduled-rental', 'scheduled-maintenance'])
    );

    const unsubscribe = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const rental = { id: change.doc.id, ...change.doc.data() };
        const vehicleRef = doc(db, 'vehicles', rental.vehicleId);
        
        // Map rental status to vehicle status
        let newStatus;
        if (rental.status === 'scheduled-rental') {
          newStatus = 'hired';
        } else if (rental.status === 'scheduled-maintenance') {
          newStatus = 'maintenance';
        }

        if (newStatus) {
          await updateDoc(vehicleRef, { 
            status: newStatus,
            updatedAt: new Date()
          });
        }
      });
    });

    return () => unsubscribe();
  }, []);
};