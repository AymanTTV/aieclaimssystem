import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateVehicleStatus } from '../utils/vehicleStatus';

export const useVehicleStatusUpdates = () => {
  useEffect(() => {
    // Monitor rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['active', 'completed', 'cancelled'])
    );

    // Monitor maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['scheduled', 'in-progress', 'completed', 'cancelled'])
    );

    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const rental = { id: change.doc.id, ...change.doc.data() };
          handleRentalStatusChange(rental);
        }
      });
    });

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified') {
          const maintenance = { id: change.doc.id, ...change.doc.data() };
          handleMaintenanceStatusChange(maintenance);
        }
      });
    });

    return () => {
      unsubscribeRentals();
      unsubscribeMaintenance();
    };
  }, []);
};