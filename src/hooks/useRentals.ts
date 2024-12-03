import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Rental } from '../types';

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
          rentalData.push({
            id: doc.id,
            ...data,
            startDate: data.startDate.toDate(),
            endDate: data.endDate.toDate(),
          } as Rental);
        });
        setRentals(rentalData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vehicleId]);

  return { rentals, loading, error };
};