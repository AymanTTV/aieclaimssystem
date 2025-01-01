import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Rental } from '../types';
import { ensureValidDate } from '../utils/dateHelpers';

export const useRentals = (vehicleId?: string) => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'rentals'), orderBy('startDate', 'desc'));
    
    if (vehicleId) {
      q = query(q, where('vehicleId', '==', vehicleId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rentalData: Rental[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          try {
            // Safely convert Firestore timestamps to dates
            const rental: Rental = {
              id: doc.id,
              ...data,
              startDate: ensureValidDate(data.startDate) || new Date(),
              endDate: ensureValidDate(data.endDate) || new Date(),
              createdAt: ensureValidDate(data.createdAt) || new Date(),
              updatedAt: ensureValidDate(data.updatedAt) || new Date(),
              // Handle optional dates
              extensionHistory: data.extensionHistory?.map((ext: any) => ({
                ...ext,
                date: ensureValidDate(ext.date) || new Date(),
                originalEndDate: ensureValidDate(ext.originalEndDate) || new Date(),
                newEndDate: ensureValidDate(ext.newEndDate) || new Date(),
              })) || []
            };
            rentalData.push(rental);
          } catch (err) {
            console.error('Error processing rental data:', err);
          }
        });
        setRentals(rentalData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching rentals:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vehicleId]);

  return { rentals, loading, error };
};