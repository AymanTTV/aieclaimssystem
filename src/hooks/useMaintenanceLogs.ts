import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MaintenanceLog } from '../types';

export const useMaintenanceLogs = (vehicleId?: string) => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'maintenanceLogs'), orderBy('date', 'desc'));
    
    if (vehicleId) {
      q = query(q, where('vehicleId', '==', vehicleId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logsData: MaintenanceLog[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          logsData.push({
            id: doc.id,
            ...data,
            date: data.date.toDate(),
          } as MaintenanceLog);
        });
        setLogs(logsData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vehicleId]);

  return { logs, loading, error };
};