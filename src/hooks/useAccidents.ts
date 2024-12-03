import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Accident } from '../types';

export const useAccidents = (vehicleId?: string) => {
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'accidents'), orderBy('date', 'desc'));
    
    if (vehicleId) {
      q = query(q, where('vehicleId', '==', vehicleId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const accidentData: Accident[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          accidentData.push({
            id: doc.id,
            ...data,
            date: data.date.toDate(),
          } as Accident);
        });
        setAccidents(accidentData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vehicleId]);

  return { accidents, loading, error };
};