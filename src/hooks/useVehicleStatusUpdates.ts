import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateVehicleStatus } from '../utils/vehicleStatusManager';

export const useVehicleStatusUpdates = () => {
  useEffect(() => {
    // Monitor rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['active', 'scheduled', 'completed', 'cancelled'])
    );

    // Monitor maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['in-progress', 'scheduled', 'completed', 'cancelled'])
    );

    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const rental = change.doc.data();
        // Update vehicle status when rental status changes or document is deleted
        if (change.type === 'modified' || change.type === 'removed') {
          updateVehicleStatus(rental.vehicleId);
        }
      });
    });

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const maintenance = change.doc.data();
        // Update vehicle status when maintenance status changes or document is deleted
        if (change.type === 'modified' || change.type === 'removed') {
          updateVehicleStatus(maintenance.vehicleId);
        }
      });
    });

    return () => {
      unsubscribeRentals();
      unsubscribeMaintenance();
    };
  }, []);
};