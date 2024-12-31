import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addVehicleStatus, removeVehicleStatus } from '../utils/vehicleStatusManager';

export const useVehicleStatusUpdates = () => {
  useEffect(() => {
    // Monitor rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['scheduled', 'active', 'completed'])
    );

    // Monitor maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['scheduled', 'in-progress', 'completed'])
    );

    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const rental = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'modified') {
          if (rental.status === 'active') {
            addVehicleStatus(rental.vehicleId, 'rented', 'rental');
          } else if (rental.status === 'completed') {
            removeVehicleStatus(rental.vehicleId, 'rented');
          }
        }
      });
    });

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const maintenance = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'modified') {
          if (maintenance.status === 'in-progress') {
            addVehicleStatus(maintenance.vehicleId, 'maintenance', 'maintenance');
          } else if (maintenance.status === 'completed') {
            removeVehicleStatus(maintenance.vehicleId, 'maintenance');
          }
        }
      });
    });

    return () => {
      unsubscribeRentals();
      unsubscribeMaintenance();
    };
  }, []);
};