import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addVehicleStatus, removeVehicleStatus } from '../utils/vehicleStatusManager';

export const useVehicleStatusManager = () => {
  useEffect(() => {
    // Monitor rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['active', 'completed'])
    );

    // Monitor maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['scheduled', 'in-progress', 'completed'])
    );

    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const rental = change.doc.data();
        if (rental.status === 'active') {
          addVehicleStatus(rental.vehicleId, 'rented', rental.activeStatuses || []);
        } else if (rental.status === 'completed') {
          removeVehicleStatus(rental.vehicleId, 'rented', rental.activeStatuses || []);
        }
      });
    });

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const maintenance = change.doc.data();
        if (maintenance.status === 'in-progress') {
          addVehicleStatus(maintenance.vehicleId, 'maintenance', maintenance.activeStatuses || []);
        } else if (maintenance.status === 'completed') {
          removeVehicleStatus(maintenance.vehicleId, 'maintenance', maintenance.activeStatuses || []);
        }
      });
    });

    return () => {
      unsubscribeRentals();
      unsubscribeMaintenance();
    };
  }, []);
};