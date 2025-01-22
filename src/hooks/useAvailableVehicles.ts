import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle, Rental } from '../types';
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
        // Query for rentals that are active or completed
        const rentalsQuery = query(
          collection(db, 'rentals'),
          where('status', 'in', ['active', 'completed'])
        );
        const rentalSnapshot = await getDocs(rentalsQuery);

        // Map rentals to their respective vehicles
        const vehicleRentals = new Map<string, Rental[]>();
        rentalSnapshot.forEach((doc) => {
          const data = doc.data();
          const rental = {
            ...data,
            id: doc.id,
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
          } as Rental;

          if (rental.startDate && rental.endDate) {
            const rentals = vehicleRentals.get(rental.vehicleId) || [];
            rentals.push(rental);
            vehicleRentals.set(rental.vehicleId, rentals);
          }
        });

        // Process vehicle availability
        const available = vehicles
          .filter(
            (vehicle) =>
              vehicle.status === 'available' || vehicle.status === 'completed'
          )
          .map((vehicle) => {
            const rentals = vehicleRentals.get(vehicle.id) || [];
            const now = new Date();

            // Find the most recent completed rental
            const recentCompletedRental = rentals
              .filter((r) => r.status === 'completed')
              .sort(
                (a, b) =>
                  new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
              )[0];

            let message = undefined;
            let availableFrom = now;

            // Display "Will be available at" message only for completed rentals
            if (recentCompletedRental) {
              const endDate = new Date(recentCompletedRental.endDate);
              message = `Will be available at ${format(endDate, 'dd/MM/yyyy')}`;
              availableFrom = endDate;
            }

            return {
              ...vehicle,
              availableFrom,
              message,
            };
          })
          .filter((vehicle) => {
            // If no date range is specified, include all available vehicles
            if (!startDate || !endDate) return true;

            // Check if the vehicle is available during the requested date range
            const vehicleAvailableFrom = vehicle.availableFrom || new Date();
            return isBefore(vehicleAvailableFrom, startDate);
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