// src/hooks/useMaintenanceLogs.ts

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
          
          // Ensure all Timestamp fields are converted to JS Date objects
          const date = data.date ? data.date.toDate() : undefined;
          const nextServiceDate = data.nextServiceDate ? data.nextServiceDate.toDate() : undefined;
          
          // Handle potential missing dates during conversion
          if (!date) {
            console.warn(`Maintenance log ${doc.id} missing 'date' field.`);
            return; // Skip this log if the primary date is missing
          }

          logsData.push({
            id: doc.id,
            ...data,
            date: date,
            nextServiceDate: nextServiceDate,
            // Also convert any other date fields like createdAt/updatedAt if they exist
            createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
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