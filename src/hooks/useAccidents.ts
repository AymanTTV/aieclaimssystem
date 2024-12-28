import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Accident } from '../types';

export const useAccidents = () => {
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'accidents'), orderBy('submittedAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const accidentData: Accident[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          accidentData.push({
            id: doc.id,
            ...data,
            submittedAt: data.submittedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            status: data.status || 'reported',
            type: data.type || 'pending',
          } as Accident);
        });
        setAccidents(accidentData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching accidents:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { accidents, loading, error };
};