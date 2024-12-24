import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import { addDays } from 'date-fns';

interface AvailabilityCheck {
  isAvailable: boolean;
  conflicts: {
    rentals: boolean;
    maintenance: boolean;
    tests: boolean;
  };
}

export const useVehicleAvailability = (vehicle: Vehicle | null) => {
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityCheck>({
    isAvailable: false,
    conflicts: {
      rentals: false,
      maintenance: false,
      tests: false
    }
  });

  const checkAvailability = async (startDate: Date, endDate: Date) => {
    if (!vehicle) return false;
    setChecking(true);

    try {
      const [rentals, maintenance] = await Promise.all([
        getDocs(query(
          collection(db, 'rentals'),
          where('vehicleId', '==', vehicle.id),
          where('status', 'in', ['scheduled', 'active']),
          where('startDate', '<=', endDate),
          where('endDate', '>=', startDate)
        )),
        getDocs(query(
          collection(db, 'maintenanceLogs'),
          where('vehicleId', '==', vehicle.id),
          where('status', 'in', ['scheduled', 'in-progress']),
          where('date', '<=', endDate),
          where('date', '>=', startDate)
        ))
      ]);

      const hasRentalConflict = !rentals.empty;
      const hasMaintenanceConflict = !maintenance.empty;
      const hasTestScheduled = vehicle.status === 'test-scheduled';

      setAvailability({
        isAvailable: !hasRentalConflict && !hasMaintenanceConflict && !hasTestScheduled,
        conflicts: {
          rentals: hasRentalConflict,
          maintenance: hasMaintenanceConflict,
          tests: hasTestScheduled
        }
      });

      return !hasRentalConflict && !hasMaintenanceConflict && !hasTestScheduled;
    } catch (error) {
      console.error('Error checking vehicle availability:', error);
      return false;
    } finally {
      setChecking(false);
    }
  };

  const getNextAvailableDate = async (): Promise<Date | null> => {
    if (!vehicle) return null;
    
    const today = new Date();
    let checkDate = today;
    let found = false;
    let attempts = 0;

    while (!found && attempts < 30) {
      const isAvailable = await checkAvailability(checkDate, addDays(checkDate, 1));
      if (isAvailable) {
        found = true;
        break;
      }
      checkDate = addDays(checkDate, 1);
      attempts++;
    }

    return found ? checkDate : null;
  };

  return {
    checking,
    availability,
    checkAvailability,
    getNextAvailableDate
  };
};