import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MileageHistory } from '../types/vehicle';
import toast from 'react-hot-toast';

export const useMileageHistory = (vehicleId: string) => {
  const [history, setHistory] = useState<MileageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'mileageHistory'),
      where('vehicleId', '==', vehicleId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const historyData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        })) as MileageHistory[];
        
        setHistory(historyData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching mileage history:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vehicleId]);

  return { history, loading, error };
};