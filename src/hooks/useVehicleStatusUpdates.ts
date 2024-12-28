import { useEffect } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { addVehicleStatus, removeVehicleStatus } from '../utils/vehicleStatusManager';

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
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'modified') {
          const rental = { id: change.doc.id, ...change.doc.data() };
          const vehicleDoc = await getDoc(doc(db, 'vehicles', rental.vehicleId));
          const vehicle = vehicleDoc.data();
          
          if (rental.status === 'active') {
            await addVehicleStatus(rental.vehicleId, 'rented', vehicle?.activeStatuses);
          } else if (rental.status === 'completed' || rental.status === 'cancelled') {
            await removeVehicleStatus(rental.vehicleId, 'rented', vehicle?.activeStatuses);
          }
        }
      });
    });

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'modified') {
          const maintenance = { id: change.doc.id, ...change.doc.data() };
          const vehicleDoc = await getDoc(doc(db, 'vehicles', maintenance.vehicleId));
          const vehicle = vehicleDoc.data();
          
          if (maintenance.status === 'in-progress') {
            await addVehicleStatus(maintenance.vehicleId, 'maintenance', vehicle?.activeStatuses);
          } else if (maintenance.status === 'completed' || maintenance.status === 'cancelled') {
            await removeVehicleStatus(maintenance.vehicleId, 'maintenance', vehicle?.activeStatuses);
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