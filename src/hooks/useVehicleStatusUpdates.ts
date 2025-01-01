import { useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const useVehicleStatusUpdates = () => {
  useEffect(() => {
    // Monitor rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['scheduled', 'active'])
    );

    // Monitor maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['scheduled', 'in-progress'])
    );

    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const rental = { id: change.doc.id, ...change.doc.data() };
        const vehicleRef = doc(db, 'vehicles', rental.vehicleId);
        
        if (rental.status === 'active') {
          await updateDoc(vehicleRef, { status: 'rented' });
        } else if (rental.status === 'scheduled') {
          await updateDoc(vehicleRef, { status: 'scheduled-rental' });
        }
      });
    });

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const maintenance = { id: change.doc.id, ...change.doc.data() };
        const vehicleRef = doc(db, 'vehicles', maintenance.vehicleId);
        
        if (maintenance.status === 'in-progress') {
          await updateDoc(vehicleRef, { status: 'maintenance' });
        } else if (maintenance.status === 'scheduled') {
          await updateDoc(vehicleRef, { status: 'scheduled-maintenance' });
        }
      });
    });

    return () => {
      unsubscribeRentals();
      unsubscribeMaintenance();
    };
  }, []);
};