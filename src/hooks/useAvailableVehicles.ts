// src/hooks/useAvailableVehicles.ts

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import { addDays, isBefore, isAfter, format } from 'date-fns';

interface VehicleAvailability extends Vehicle {
  availableFrom?: Date;
  message?: string;
}

export const useAvailableVehicles = (
  vehicles: Vehicle[],
  startDate?: Date,
  endDate?: Date
) => {
  const [availableVehicles, setAvailableVehicles] = useState<VehicleAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
  try {
    // Filter vehicles first to only include available and completed rentals
    const availableVehicles = vehicles.filter(vehicle => 
      // Only include vehicles that are:
      // 1. Currently available
      vehicle.status === 'available' ||
      // 2. Have completed rentals with an availability date
      (vehicle.status === 'completed' && vehicle.availableFrom)
    );

    // Query for active and scheduled rentals
    const rentalsQuery = query(
      collection(db, 'rentals'),
      where('status', 'in', ['active', 'scheduled'])
    );

    const rentalSnapshot = await getDocs(rentalsQuery);

    // Map of vehicle IDs to their unavailable periods
    const unavailablePeriods = new Map<string, Array<{ start: Date; end: Date }>>();

    // Process rentals
    rentalSnapshot.forEach(doc => {
      const rental = doc.data();
      const periods = unavailablePeriods.get(rental.vehicleId) || [];
      periods.push({
        start: rental.startDate.toDate(),
        end: rental.endDate.toDate()
      });
      unavailablePeriods.set(rental.vehicleId, periods);
    });

    // Filter and process vehicles
    const available = availableVehicles
      .map(vehicle => {
        // For completed rentals, show availability date
        if (vehicle.status === 'completed' && vehicle.availableFrom) {
          return {
            ...vehicle,
            availableFrom: vehicle.availableFrom,
            message: `Available from ${format(vehicle.availableFrom, 'dd/MM/yyyy')}`
          };
        }

        // For currently available vehicles
        if (vehicle.status === 'available') {
          const periods = unavailablePeriods.get(vehicle.id) || [];
          
          // If dates are specified, check for conflicts
          if (startDate && endDate) {
            const hasConflict = periods.some(period => 
              !(isAfter(startDate, period.end) || isBefore(endDate, period.start))
            );

            if (hasConflict) {
              return null; // Vehicle not available for requested period
            }
          }

          return {
            ...vehicle,
            availableFrom: new Date(),
            message: 'Available now'
          };
        }

        return null;
      })
      .filter((v): v is VehicleAvailability => v !== null)
      .sort((a, b) => {
        // Sort available vehicles first, then by availability date
        if (a.status === 'available' && b.status !== 'available') return -1;
        if (a.status !== 'available' && b.status === 'available') return 1;
        return a.availableFrom.getTime() - b.availableFrom.getTime();
      });

    setAvailableVehicles(available);
  } catch (error) {
    console.error('Error fetching vehicle availability:', error);
  } finally {
    setLoading(false);
  }
};

    fetchAvailability();
  }, [vehicles, startDate, endDate]);

  return { availableVehicles, loading };
};

export default useAvailableVehicles;
