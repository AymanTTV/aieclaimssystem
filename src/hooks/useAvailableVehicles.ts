// src/hooks/useAvailableVehicles.ts
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle, Rental } from '../types';
import { isBefore, isAfter, format, startOfDay, endOfDay, isValid } from 'date-fns';

export interface VehicleAvailability extends Vehicle {
  availableFrom?: Date;
  message?: string;
  isSubstitution?: boolean;
  hasConflict?: boolean; // ✅ Added to prevent booking
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
            // ✅ Strip spaces from the primary vehicle registration
            const vehicleReg = (vehicle.registrationNumber || '').replace(/\s/g, '').toLowerCase();
            
            let subStatusMessage = '';
            let isSub = false;

            activeRentals.forEach(rental => {
              // Check primary vehicleId
              if (rental.vehicleId === vehicle.id) {
                const rStart = parseFirebaseDate(rental.startDate);
                const rEnd = parseFirebaseDate(rental.endDate);
                if (rStart && rEnd) periods.push({ start: rStart, end: rEnd });
              }

              // Check if vehicle is used as a substitution
              if (rental.hireSubstitutionDetails && rental.hireSubstitutionDetails.length > 0) {
                rental.hireSubstitutionDetails.forEach(sub => {
                  // ✅ Strip spaces from the substitute registration
                  const subReg = (sub.registration || '').replace(/\s/g, '').toLowerCase();
                  
                  if (vehicleReg && subReg && vehicleReg === subReg && !sub.returnCondition) {
                    let sStart = parseFirebaseDate(sub.givenAt);
                    let sEnd = parseFirebaseDate(sub.expectedReturnAt);
                    
                    if (sStart && sEnd) {
                      const now = new Date();
                      // ✅ Enforce active time window for currently active rentals
                      if (isAfter(sStart, now)) sStart = now;
                      if (isBefore(sEnd, now)) sEnd = now;

                      periods.push({ start: sStart, end: sEnd });
                      isSub = true;
                      subStatusMessage = `ON SUB: ${format(sStart, 'dd/MM HH:mm')} → ${format(sEnd, 'dd/MM HH:mm')}`;
                    }
                  }
                });
              }
            });

            // ✅ ALWAYS check for conflict using provided dates or defaulting to today
            const searchStart = startDate ? startOfDay(startDate) : startOfDay(new Date());
            const searchEnd = endDate ? endOfDay(endDate) : endOfDay(searchStart);

            const hasConflict = periods.some(period => {
              const pStart = startOfDay(period.start);
              const pEnd = endOfDay(period.end);
              return searchStart <= pEnd && searchEnd >= pStart;
            });

            if (hasConflict) {
              if (isSub) {
                 // ✅ Let it show up but mark as unselectable conflict
                 return {
                    ...vehicle,
                    availableFrom: vehicle.availableFrom || new Date(),
                    isSubstitution: true,
                    hasConflict: true,
                    message: subStatusMessage || 'Currently on substitution'
                 };
              }
              return null; // Hide primary conflicts
            }

            return {
              ...vehicle,
              availableFrom: vehicle.availableFrom || new Date(),
              isSubstitution: isSub,
              hasConflict: false,
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