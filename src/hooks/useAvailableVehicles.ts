// src/hooks/useAvailableVehicles.ts
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle, Rental } from '../types';
import { isBefore, isAfter, format, startOfDay, endOfDay, isValid } from 'date-fns';

interface VehicleAvailability extends Vehicle {
  availableFrom?: Date;
  message?: string;
  isSubstitution?: boolean;
}

const parseFirebaseDate = (date: any): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  if (typeof date.toDate === 'function') return date.toDate();
  const parsed = new Date(date);
  return isValid(parsed) ? parsed : null;
};

export const useAvailableVehicles = (
  vehicles: Vehicle[],
  startDate?: Date,
  endDate?: Date,
  excludeRentalId?: string
) => {
  const [availableVehicles, setAvailableVehicles] = useState<VehicleAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  const startTs = startDate?.getTime();
  const endTs = endDate?.getTime();

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);

        const baseVehicles = vehicles.filter(v => 
          v.status === 'available' || (v.status === 'completed' && v.availableFrom)
        );

        const rentalsQuery = query(
          collection(db, 'rentals'),
          where('status', 'in', ['active', 'scheduled'])
        );

        const rentalSnapshot = await getDocs(rentalsQuery);
        const activeRentals = rentalSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Rental))
          .filter(r => r.id !== excludeRentalId);

        const available = baseVehicles
          .map(vehicle => {
            const periods: Array<{ start: Date; end: Date }> = [];
            const vehicleReg = vehicle.registrationNumber?.toLowerCase()?.trim();
            
            let subStatusMessage = '';
            let isSub = false;

            activeRentals.forEach(rental => {
              // Check primary vehicleId
              if (rental.vehicleId === vehicle.id) {
                const rStart = parseFirebaseDate(rental.startDate);
                const rEnd = parseFirebaseDate(rental.endDate);
                if (rStart && rEnd) periods.push({ start: rStart, end: rEnd });
              }

              // ✅ Check if vehicle is used as a substitution
              if (rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0) {
                rental.hireSubstitutionDetails.forEach(sub => {
                  const subReg = sub.registration?.toLowerCase()?.trim();
                  if (vehicleReg && subReg && vehicleReg === subReg && !sub.returnCondition) {
                    const sStart = parseFirebaseDate(sub.givenAt);
                    const sEnd = parseFirebaseDate(sub.expectedReturnAt);
                    if (sStart && sEnd) {
                      periods.push({ start: sStart, end: sEnd });
                      isSub = true;
                      subStatusMessage = `ON SUB: ${format(sStart, 'dd/MM HH:mm')} → ${format(sEnd, 'dd/MM HH:mm')}`;
                    }
                  }
                });
              }
            });

            if (startDate && endDate) {
              const searchStart = startOfDay(startDate);
              const searchEnd = endOfDay(endDate);
              const hasConflict = periods.some(period => {
                const pStart = startOfDay(period.start);
                const pEnd = endOfDay(period.end);
                return searchStart <= pEnd && searchEnd >= pStart;
              });
              if (hasConflict && !isSub) return null; // Hide if it's a primary conflict
            }

            return {
              ...vehicle,
              availableFrom: vehicle.availableFrom || new Date(),
              isSubstitution: isSub,
              message: subStatusMessage || (vehicle.availableFrom 
                ? `Available from ${format(vehicle.availableFrom, 'dd/MM/yyyy')}` 
                : 'Available now')
            };
          })
          .filter((v): v is VehicleAvailability => v !== null)
          .sort((a, b) => (a.availableFrom?.getTime() || 0) - (b.availableFrom?.getTime() || 0));

        setAvailableVehicles(available);
      } catch (error) {
        console.error('Error fetching availability:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [vehicles, startTs, endTs, excludeRentalId]);

  return { availableVehicles, loading };
};