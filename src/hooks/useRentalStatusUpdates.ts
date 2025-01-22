import { useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';

export const useRentalStatusUpdates = () => {
  useEffect(() => {
    // Monitor rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['active', 'scheduled', 'completed'])
    );

    // Monitor maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['scheduled', 'in-progress', 'completed'])
    );

    const updateVehicleStatuses = async (vehicleId: string, activeStatuses: string[]) => {
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      const vehicleDoc = await getDoc(vehicleRef);
      
      if (vehicleDoc.exists()) {
        const currentStatuses = vehicleDoc.data().activeStatuses || [];
        
        // Combine current and new statuses, removing duplicates
        const updatedStatuses = Array.from(new Set([...currentStatuses, ...activeStatuses]));
        
        // Determine primary status
        let primaryStatus: Vehicle['status'] = 'available';
        if (updatedStatuses.includes('maintenance')) {
          primaryStatus = 'maintenance';
        }
        if (updatedStatuses.includes('hired')) {
          // If vehicle is both in maintenance and hired, show both statuses
          if (primaryStatus === 'maintenance') {
            primaryStatus = 'maintenance';
          } else {
            primaryStatus = 'hired';
          }
        }
        if (updatedStatuses.includes('scheduled') && primaryStatus === 'available') {
          primaryStatus = 'scheduled';
        }

        await updateDoc(vehicleRef, {
          status: primaryStatus,
          activeStatuses: updatedStatuses,
          updatedAt: new Date()
        });
      }
    };

    const removeVehicleStatus = async (vehicleId: string, statusToRemove: string) => {
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      const vehicleDoc = await getDoc(vehicleRef);
      
      if (vehicleDoc.exists()) {
        const currentStatuses = vehicleDoc.data().activeStatuses || [];
        const updatedStatuses = currentStatuses.filter((s: string) => s !== statusToRemove);
        
        // Determine new primary status
        let primaryStatus: Vehicle['status'] = 'available';
        if (updatedStatuses.includes('maintenance')) {
          primaryStatus = 'maintenance';
        }
        if (updatedStatuses.includes('hired')) {
          if (primaryStatus === 'maintenance') {
            primaryStatus = 'maintenance';
          } else {
            primaryStatus = 'hired';
          }
        }
        if (updatedStatuses.includes('scheduled') && primaryStatus === 'available') {
          primaryStatus = 'scheduled';
        }

        await updateDoc(vehicleRef, {
          status: primaryStatus,
          activeStatuses: updatedStatuses,
          updatedAt: new Date()
        });
      }
    };

    // Subscribe to rental changes
    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const rental = change.doc.data();
        const vehicleId = rental.vehicleId;

        if (change.type === 'modified' || change.type === 'added') {
          switch (rental.status) {
            case 'active':
              await updateVehicleStatuses(vehicleId, ['hired']);
              break;
            case 'scheduled':
              await updateVehicleStatuses(vehicleId, ['scheduled']);
              break;
            case 'completed':
              await removeVehicleStatus(vehicleId, 'hired');
              await removeVehicleStatus(vehicleId, 'scheduled');
              break;
          }
        }
      });
    });

    // Subscribe to maintenance changes
    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const maintenance = change.doc.data();
        const vehicleId = maintenance.vehicleId;

        if (change.type === 'modified' || change.type === 'added') {
          switch (maintenance.status) {
            case 'in-progress':
              await updateVehicleStatuses(vehicleId, ['maintenance']);
              break;
            case 'scheduled':
              await updateVehicleStatuses(vehicleId, ['scheduled']);
              break;
            case 'completed':
              await removeVehicleStatus(vehicleId, 'maintenance');
              await removeVehicleStatus(vehicleId, 'scheduled');
              break;
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
