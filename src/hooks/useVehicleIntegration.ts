import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateVehicleStatus } from '../utils/vehicleStatus';
import { Vehicle } from '../types';

export const useVehicleIntegration = () => {
  useEffect(() => {
    // Monitor active rentals and maintenance
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['active', 'completed'])
    );

    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['scheduled', 'in-progress', 'completed'])
    );

    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const rental = change.doc.data();
        updateVehicleStatus(rental.vehicleId, rental.status === 'active' ? 'rented' : 'available');
      });
    });

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const maintenance = change.doc.data();
        const status = maintenance.status === 'completed' ? 'available' : 
                      maintenance.type.includes('test') ? 'test-scheduled' : 'maintenance';
        updateVehicleStatus(maintenance.vehicleId, status);
      });
    });

    return () => {
      unsubscribeRentals();
      unsubscribeMaintenance();
    };
  }, []);
};