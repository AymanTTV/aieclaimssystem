import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Vehicle } from '../types';

export const useVehicleStatusTracking = () => {
  useEffect(() => {
    // Monitor active rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['active', 'scheduled'])
    );

    // Monitor maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['scheduled', 'in-progress'])
    );

    // Subscribe to rental changes
    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const rental = change.doc.data();
        const vehicleRef = doc(db, 'vehicles', rental.vehicleId);

        if (rental.status === 'active') {
          await updateDoc(vehicleRef, { status: 'rented' });
        }
      });
    });

    // Subscribe to maintenance changes  
    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const maintenance = change.doc.data();
        const vehicleRef = doc(db, 'vehicles', maintenance.vehicleId);

        if (maintenance.status === 'in-progress') {
          await updateDoc(vehicleRef, { status: 'maintenance' });
        }
      });
    });

    return () => {
      unsubscribeRentals();
      unsubscribeMaintenance(); 
    };
  }, []);
};