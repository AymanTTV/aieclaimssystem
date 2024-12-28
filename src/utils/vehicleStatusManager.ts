import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VehicleStatus } from '../types';
import toast from 'react-hot-toast';

export const addVehicleStatus = async (
  vehicleId: string, 
  status: VehicleStatus,
  currentStatuses: VehicleStatus[] = []
) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    
    if (!vehicleDoc.exists()) {
      throw new Error('Vehicle not found');
    }

    const existingStatuses = vehicleDoc.data().activeStatuses || [];
    
    // Don't add duplicate statuses
    if (existingStatuses.includes(status)) {
      return true;
    }

    // Add the new status
    const updatedStatuses = [...existingStatuses, status];

    await updateDoc(vehicleRef, {
      activeStatuses: updatedStatuses,
      status: status, // Keep the main status field updated for backwards compatibility
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error adding vehicle status:', error);
    toast.error('Failed to update vehicle status');
    return false;
  }
};

export const removeVehicleStatus = async (
  vehicleId: string, 
  status: VehicleStatus,
  currentStatuses: VehicleStatus[] = []
) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    const vehicleDoc = await getDoc(vehicleRef);
    
    if (!vehicleDoc.exists()) {
      throw new Error('Vehicle not found');
    }

    const existingStatuses = vehicleDoc.data().activeStatuses || [];
    
    // Remove the status
    const updatedStatuses = existingStatuses.filter(s => s !== status);

    await updateDoc(vehicleRef, {
      activeStatuses: updatedStatuses.length ? updatedStatuses : ['available'],
      status: updatedStatuses.length ? updatedStatuses[0] : 'available', // Update main status field
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error removing vehicle status:', error);
    toast.error('Failed to update vehicle status');
    return false;
  }
};

export const initializeVehicleStatus = async (vehicleId: string) => {
  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      activeStatuses: ['available'],
      status: 'available',
      updatedAt: new Date()
    });
    return true;
  } catch (error) {
    console.error('Error initializing vehicle status:', error);
    return false;
  }
};