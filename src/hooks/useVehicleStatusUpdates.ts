import { useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VehicleStatus } from '../types';

export const useVehicleStatusUpdates = () => {
  useEffect(() => {
    // Monitor rentals and maintenance
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['active', 'scheduled'])
    );

    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['in-progress', 'scheduled'])
    );

    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const rental = { id: change.doc.id, ...change.doc.data() };
        const vehicleRef = doc(db, 'vehicles', rental.vehicleId);
        const vehicleDoc = await getDoc(vehicleRef);
        const vehicle = vehicleDoc.data();

        if (vehicle) {
          const activeStatuses = [...(vehicle.activeStatuses || [])];

          // Add rental status if not already present
          if (rental.status === 'active' && !activeStatuses.includes('rented')) {
            activeStatuses.push('rented');
          } else if (rental.status === 'scheduled' && !activeStatuses.includes('scheduled-rental')) {
            activeStatuses.push('scheduled-rental');
          }

          // Update vehicle with new statuses
          await updateDoc(vehicleRef, {
            activeStatuses,
            status: getEffectiveStatus(activeStatuses),
            updatedAt: new Date()
          });
        }
      });
    });

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const maintenance = { id: change.doc.id, ...change.doc.data() };
        const vehicleRef = doc(db, 'vehicles', maintenance.vehicleId);
        const vehicleDoc = await getDoc(vehicleRef);
        const vehicle = vehicleDoc.data();

        if (vehicle) {
          const activeStatuses = [...(vehicle.activeStatuses || [])];

          // Add maintenance status if not already present
          if (maintenance.status === 'in-progress' && !activeStatuses.includes('maintenance')) {
            activeStatuses.push('maintenance');
          } else if (maintenance.status === 'scheduled' && !activeStatuses.includes('scheduled-maintenance')) {
            activeStatuses.push('scheduled-maintenance');
          }

          // Update vehicle with new statuses
          await updateDoc(vehicleRef, {
            activeStatuses,
            status: getEffectiveStatus(activeStatuses),
            updatedAt: new Date()
          });
        }
      });
    });

    return () => {
      unsubscribeRentals();
      unsubscribeMaintenance();
    };
  }, []);
};

// Helper function to determine the primary status
const getEffectiveStatus = (statuses: VehicleStatus[]): VehicleStatus => {
  if (statuses.includes('maintenance')) return 'maintenance';
  if (statuses.includes('rented')) return 'rented';
  if (statuses.includes('scheduled-maintenance')) return 'scheduled-maintenance';
  if (statuses.includes('scheduled-rental')) return 'scheduled-rental';
  if (statuses.includes('claim')) return 'claim';
  return 'available';
};
