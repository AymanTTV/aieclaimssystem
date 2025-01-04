import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export const checkDuplicateVehicle = async (
  registrationNumber: string,
  vin: string,
  vehicleId?: string // Optional - used when editing
): Promise<boolean> => {
  try {
    // Check registration number
    const regQuery = query(
      collection(db, 'vehicles'),
      where('registrationNumber', '==', registrationNumber.toUpperCase())
    );
    const regDocs = await getDocs(regQuery);
    
    if (!regDocs.empty && (!vehicleId || regDocs.docs[0].id !== vehicleId)) {
      toast.error('A vehicle with this registration number already exists');
      return true;
    }

    // Check VIN
    const vinQuery = query(
      collection(db, 'vehicles'),
      where('vin', '==', vin.toUpperCase())
    );
    const vinDocs = await getDocs(vinQuery);
    
    if (!vinDocs.empty && (!vehicleId || vinDocs.docs[0].id !== vehicleId)) {
      toast.error('A vehicle with this VIN already exists');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    toast.error('Error checking for duplicate vehicles');
    return false;
  }
};