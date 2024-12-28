import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';

export const useVehicleStatus = (vehicleId: string) => {
  const [status, setStatus] = useState<Vehicle['status']>('available');
  const [maintenanceStatus, setMaintenanceStatus] = useState<string | null>(null);
  const [rentalStatus, setRentalStatus] = useState<string | null>(null);

  useEffect(() => {
    // Monitor active rentals
    const rentalQuery = query(
      collection(db, 'rentals'),
      where('vehicleId', '==', vehicleId),
      where('status', 'in', ['scheduled', 'active'])
    );

    // Monitor maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('vehicleId', '==', vehicleId),
      where('status', 'in', ['scheduled', 'in-progress'])
    );

    const unsubscribeRental = onSnapshot(rentalQuery, (snapshot) => {
      const activeRental = snapshot.docs[0]?.data();
      if (activeRental) {
        setRentalStatus(activeRental.status);
      } else {
        setRentalStatus(null);
      }
    });

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, (snapshot) => {
      const activeMaintenance = snapshot.docs[0]?.data();
      if (activeMaintenance) {
        setMaintenanceStatus(activeMaintenance.status);
      } else {
        setMaintenanceStatus(null);
      }
    });

    return () => {
      unsubscribeRental();
      unsubscribeMaintenance();
    };
  }, [vehicleId]);

  // Determine final status based on maintenance and rental status
  useEffect(() => {
    if (maintenanceStatus) {
      setStatus('maintenance');
    } else if (rentalStatus === 'active') {
      setStatus('rented');
    } else if (rentalStatus === 'scheduled') {
      setStatus('scheduled');
    } else {
      setStatus('available');
    }
  }, [maintenanceStatus, rentalStatus]);

  return status;
};