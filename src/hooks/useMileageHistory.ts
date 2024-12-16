import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
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

    const fetchHistory = async () => {
      try {
        const mileageRef = collection(db, 'mileageHistory');
        const q = query(
          mileageRef,
          where('vehicleId', '==', vehicleId),
          orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        const historyData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        })) as MileageHistory[];

        setHistory(historyData);
      } catch (err) {
        console.error('Error fetching mileage history:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [vehicleId]);

  return { history, loading, error };
};