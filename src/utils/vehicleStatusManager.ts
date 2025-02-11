import { doc, updateDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';

import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import toast from 'react-hot-toast';


export const updateVehicleStatus = async (
  vehicleId: string,
  newStatus: Vehicle['status'],
  reason?: string
): Promise<boolean> => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    
    await updateDoc(vehicleRef, {
      status: newStatus,
      statusReason: reason || null,
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    toast.error('Failed to update vehicle status');
    return false;
  }
};

export const syncVehicleStatuses = async () => {
  try {
    // Get all vehicles
    const vehiclesRef = collection(db, 'vehicles');
    const vehiclesSnapshot = await getDocs(vehiclesRef);

    // Get all active and scheduled rentals
    const rentalsRef = collection(db, 'rentals');
    const rentalsQuery = query(
      rentalsRef,
      where('status', 'in', ['active', 'scheduled'])
    );
    const rentalsSnapshot = await getDocs(rentalsQuery);

    // Get all active and scheduled maintenance records
    const maintenanceRef = collection(db, 'maintenanceLogs');
    const maintenanceQuery = query(
      maintenanceRef,
      where('status', 'in', ['in-progress', 'scheduled'])
    );
    const maintenanceSnapshot = await getDocs(maintenanceQuery);

    // Create a map of vehicle IDs to their active statuses
    const statusMap = new Map<string, Vehicle['status'][]>();

    rentalsSnapshot.forEach(doc => {
      const rental = doc.data();
      const currentStatuses = statusMap.get(rental.vehicleId) || [];
      if (rental.status === 'active') {
        statusMap.set(rental.vehicleId, [...currentStatuses, 'rented']);
      } else if (rental.status === 'scheduled') {
        statusMap.set(rental.vehicleId, [...currentStatuses, 'scheduled-rental']);
      }
    });

    maintenanceSnapshot.forEach(doc => {
      const maintenance = doc.data();
      const currentStatuses = statusMap.get(maintenance.vehicleId) || [];
      if (maintenance.status === 'in-progress') {
        statusMap.set(maintenance.vehicleId, [...currentStatuses, 'maintenance']);
      } else if (maintenance.status === 'scheduled') {
        statusMap.set(maintenance.vehicleId, [...currentStatuses, 'scheduled-maintenance']);
      }
    });

    // Update each vehicle's status
    const batch = writeBatch(db);

    vehiclesSnapshot.forEach(doc => {
      const vehicle = doc.data();
      
      // Skip updating sold vehicles
      if (vehicle.status === 'sold') {
        return;
      }

      const activeStatuses = statusMap.get(doc.id) || [];
      const currentActiveStatuses = vehicle.activeStatuses || [];

      // Determine the primary status based on priority
      let primaryStatus: Vehicle['status'] = 'available';

      if (activeStatuses.includes('maintenance')) {
        primaryStatus = 'maintenance';
      } else if (activeStatuses.includes('rented')) {
        primaryStatus = 'rented';
      } else if (activeStatuses.includes('scheduled-maintenance')) {
        primaryStatus = 'scheduled-maintenance';
      } else if (activeStatuses.includes('scheduled-rental')) {
        primaryStatus = 'scheduled-rental';
      }

      // Update vehicle only if its status needs to change
      if (vehicle.status !== primaryStatus || !arraysEqual(currentActiveStatuses, activeStatuses)) {
        batch.update(doc.ref, {
          status: primaryStatus,
          activeStatuses,
          updatedAt: new Date()
        });
      }
    });

    await batch.commit();
    toast.success('Vehicle statuses synchronized successfully');
  } catch (error) {
    console.error('Error syncing vehicle statuses:', error);
    toast.error('Failed to sync vehicle statuses');
  }
};

// Helper function to compare two arrays
const arraysEqual = (a: any[], b: any[]): boolean => {
  if (!Array.isArray(a) || !Array.isArray(b)) return false; // Ensure both are arrays
  return a.length === b.length && a.every((value, index) => value === b[index]);
};





/**
 * Add a status to a vehicle's active statuses
 */
export const addVehicleStatus = async (
  vehicleId: string,
  status: Vehicle['status'],
  currentStatuses: Vehicle['status'][]
) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const updatedStatuses = Array.from(new Set([...currentStatuses, status]));
    
    // Determine primary status based on priority
    let primaryStatus: Vehicle['status'] = 'available';
    
    // Priority order: maintenance > rented > scheduled-maintenance > scheduled-rental
    if (updatedStatuses.includes('maintenance')) {
      primaryStatus = 'maintenance';
    } else if (updatedStatuses.includes('rented')) {
      primaryStatus = 'rented';
    } else if (updatedStatuses.includes('scheduled-maintenance')) {
      primaryStatus = 'scheduled-maintenance';
    } else if (updatedStatuses.includes('scheduled-rental')) {
      primaryStatus = 'scheduled-rental';
    } else if (updatedStatuses.includes('claim')) {
      primaryStatus = 'claim';
    } else if (updatedStatuses.includes('sold')) {
      primaryStatus = 'sold';
    }

    await updateDoc(vehicleRef, {
      status: primaryStatus,
      activeStatuses: updatedStatuses,
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Error adding vehicle status:', error);
    toast.error('Failed to update vehicle status');
  }
};

/**
 * Remove a status from a vehicle's active statuses
 */
export const removeVehicleStatus = async (
  vehicleId: string,
  status: Vehicle['status'],
  currentStatuses: Vehicle['status'][]
) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const updatedStatuses = currentStatuses.filter(s => s !== status);
    
    // Determine new primary status
    let primaryStatus: Vehicle['status'] = 'available';
    
    // Maintain same priority order when removing statuses
    if (updatedStatuses.includes('maintenance')) {
      primaryStatus = 'maintenance';
    } else if (updatedStatuses.includes('rented')) {
      primaryStatus = 'rented';
    } else if (updatedStatuses.includes('scheduled-maintenance')) {
      primaryStatus = 'scheduled-maintenance';
    } else if (updatedStatuses.includes('scheduled-rental')) {
      primaryStatus = 'scheduled-rental';
    } else if (updatedStatuses.includes('claim')) {
      primaryStatus = 'claim';
    } else if (updatedStatuses.includes('sold')) {
      primaryStatus = 'sold';
    }

    await updateDoc(vehicleRef, {
      status: primaryStatus,
      activeStatuses: updatedStatuses,
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Error removing vehicle status:', error);
    toast.error('Failed to update vehicle status');
  }
};

export const resetAllVehicleStatuses = async (vehicles: Vehicle[]) => {
  try {
    for (const vehicle of vehicles) {
      await checkVehicleStatus(vehicle.id);
    }
    toast.success('Vehicle statuses updated successfully');
  } catch (error) {
    console.error('Error resetting vehicle statuses:', error);
    toast.error('Failed to reset vehicle statuses');
  }
};


/**
 * Check and update vehicle status based on active rentals and maintenance
 */
export const checkVehicleStatus = async (vehicleId: string): Promise<Vehicle['status']> => {
  try {
    // Only check for ACTIVE or SCHEDULED records
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('vehicleId', '==', vehicleId),
      where('status', 'in', ['active', 'scheduled'])
    );
    const rentalSnapshot = await getDocs(rentalsQuery);

    const maintenanceQuery = query(
      collection(db, 'maintenanceLogs'),
      where('vehicleId', '==', vehicleId),
      where('status', 'in', ['in-progress', 'scheduled'])
    );
    const maintenanceSnapshot = await getDocs(maintenanceQuery);

    // If no active records are found, the vehicle should be available
    if (rentalSnapshot.empty && maintenanceSnapshot.empty) {
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      await updateDoc(vehicleRef, {
        status: 'available',
        activeStatuses: [],
        updatedAt: new Date()
      });
      return 'available';
    }

    // Collect all active statuses
    const activeStatuses: Vehicle['status'][] = [];

    // Process rental statuses
    rentalSnapshot.forEach(doc => {
      const rental = doc.data();
      if (rental.status === 'active') {
        activeStatuses.push('rented');
      } else if (rental.status === 'scheduled') {
        activeStatuses.push('scheduled-rental');
      }
    });

    // Process maintenance statuses
    maintenanceSnapshot.forEach(doc => {
      const maintenance = doc.data();
      if (maintenance.status === 'in-progress') {
        activeStatuses.push('maintenance');
      } else if (maintenance.status === 'scheduled') {
        activeStatuses.push('scheduled-maintenance');
      }
    });

    // Determine primary status based on priority
    let primaryStatus: Vehicle['status'] = 'available';
    if (activeStatuses.includes('maintenance')) {
      primaryStatus = 'maintenance';
    } else if (activeStatuses.includes('rented')) {
      primaryStatus = 'rented';
    } else if (activeStatuses.includes('scheduled-maintenance')) {
      primaryStatus = 'scheduled-maintenance';
    } else if (activeStatuses.includes('scheduled-rental')) {
      primaryStatus = 'scheduled-rental';
    }

    // Update vehicle document
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      status: primaryStatus,
      activeStatuses,
      updatedAt: new Date()
    });

    return primaryStatus;
  } catch (error) {
    console.error('Error checking vehicle status:', error);
    toast.error('Failed to check vehicle status');
    return 'available';
  }
};


/**
 * Reset vehicle status to available
 */
export const resetVehicleStatus = async (vehicleId: string): Promise<void> => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      status: 'available',
      activeStatuses: [],
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error resetting vehicle status:', error);
    toast.error('Failed to reset vehicle status');
  }
};

// Export all functions
// export {
//   addVehicleStatus,
//   removeVehicleStatus,
//   checkVehicleStatus,
//   resetVehicleStatus
// };
