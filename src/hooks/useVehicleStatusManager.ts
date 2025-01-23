// src/hooks/useVehicleStatusManager.ts

import { useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkVehicleStatus } from '../utils/vehicleStatusManager';
import { Vehicle } from '../types';
import toast from 'react-hot-toast';

export const useVehicleStatusManager = () => {
  useEffect(() => {
    // Initial sync when component mounts
    syncVehicleStatuses().catch(error => {
      console.error('Error in initial sync:', error);
    });

    // Set up listeners for rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['active', 'scheduled', 'completed', 'cancelled'])
    );

    const unsubscribeRentals = onSnapshot(rentalsQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const rental = change.doc.data();
        if (change.type === 'modified' || change.type === 'removed') {
          await checkVehicleStatus(rental.vehicleId);
        }
      });
    }, error => {
      console.error('Error in rental status listener:', error);
      toast.error('Error monitoring rental statuses');
    });

    // Set up listeners for maintenance
    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('status', 'in', ['in-progress', 'scheduled', 'completed', 'cancelled'])
    );

    const unsubscribeMaintenance = onSnapshot(maintenanceQuery, snapshot => {
      snapshot.docChanges().forEach(async change => {
        const maintenance = change.doc.data();
        if (change.type === 'modified' || change.type === 'removed') {
          await checkVehicleStatus(maintenance.vehicleId);
        }
      });
    }, error => {
      console.error('Error in maintenance status listener:', error);
      toast.error('Error monitoring maintenance statuses');
    });

    // Set up periodic sync every 30 seconds
    const syncInterval = setInterval(() => {
      syncVehicleStatuses().catch(error => {
        console.error('Error in periodic sync:', error);
      });
    }, 30000); // 30 seconds

    // Cleanup function
    return () => {
      unsubscribeRentals();
      unsubscribeMaintenance();
      clearInterval(syncInterval);
    };
  }, []);
};

export const syncVehicleStatuses = async () => {
  try {
    // Get all active/scheduled rentals and maintenance
    const [rentalSnapshot, maintenanceSnapshot] = await Promise.all([
      getDocs(query(
        collection(db, 'rentals'),
        where('status', 'in', ['active', 'scheduled'])
      )),
      getDocs(query(
        collection(db, 'maintenanceLogs'),
        where('status', 'in', ['in-progress', 'scheduled'])
      ))
    ]);

    // Get unique vehicle IDs that need status updates
    const vehicleIds = new Set([
      ...rentalSnapshot.docs.map(doc => doc.data().vehicleId),
      ...maintenanceSnapshot.docs.map(doc => doc.data().vehicleId)
    ]);

    // Update each vehicle's status
    const updatePromises = Array.from(vehicleIds).map(vehicleId => 
      checkVehicleStatus(vehicleId)
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error syncing vehicle statuses:', error);
    throw error;
  }
};

export const resetAllVehicleStatuses = async (vehicles: Vehicle[]) => {
  try {
    await Promise.all(vehicles.map(vehicle => checkVehicleStatus(vehicle.id)));
    toast.success('Vehicle statuses synchronized successfully');
  } catch (error) {
    console.error('Error resetting vehicle statuses:', error);
    toast.error('Failed to reset vehicle statuses');
  }
};
