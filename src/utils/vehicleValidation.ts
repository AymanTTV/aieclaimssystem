import { Vehicle } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const validateVehicle = async (vehicle: Partial<Vehicle>, isEdit = false): Promise<string[]> => {
  const errors: string[] = [];

  // Check for duplicate registration
  const regQuery = query(
    collection(db, 'vehicles'),
    where('registrationNumber', '==', vehicle.registrationNumber)
  );
  const regDocs = await getDocs(regQuery);
  
  if (!isEdit && !regDocs.empty) {
    errors.push('Vehicle with this registration already exists');
  }

  // Check for duplicate VIN
  const vinQuery = query(
    collection(db, 'vehicles'),
    where('vin', '==', vehicle.vin)
  );
  const vinDocs = await getDocs(vinQuery);
  
  if (!isEdit && !vinDocs.empty) {
    errors.push('Vehicle with this VIN already exists');
  }

  return errors;
};

export const checkVehicleAvailability = async (vehicleId: string, startDate: Date, endDate: Date) => {
  const conflicts = await Promise.all([
    checkRentalConflicts(vehicleId, startDate, endDate),
    checkMaintenanceConflicts(vehicleId, startDate, endDate)
  ]);

  return !conflicts.some(Boolean);
};