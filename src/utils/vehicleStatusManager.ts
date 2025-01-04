import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';

export const addVehicleStatus = async (vehicleId: string, status: Vehicle['status'], activeStatuses: string[] = []) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    
    // Add new status if it doesn't exist
    if (!activeStatuses.includes(status)) {
      activeStatuses.push(status);
    }

    await updateDoc(vehicleRef, {
      status: getEffectiveStatus(activeStatuses),
      activeStatuses,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error adding vehicle status:', error);
  }
};

export const removeVehicleStatus = async (vehicleId: string, status: Vehicle['status'], activeStatuses: string[] = []) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    
    // Remove status
    const updatedStatuses = activeStatuses.filter(s => s !== status);
    
    await updateDoc(vehicleRef, {
      status: getEffectiveStatus(updatedStatuses),
      activeStatuses: updatedStatuses,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error removing vehicle status:', error);
  }
};

// Helper function to determine effective status
const getEffectiveStatus = (statuses: string[]): Vehicle['status'] => {
  if (statuses.includes('maintenance')) return 'maintenance';
  if (statuses.includes('rented')) return 'rented';
  if (statuses.includes('scheduled-rental')) return 'scheduled-rental';
  if (statuses.includes('scheduled-maintenance')) return 'scheduled-maintenance';
  return 'available';
};