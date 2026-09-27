// src/hooks/useMaintenanceLogs.ts

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MaintenanceLog } from '../types';
import { useAuth } from '../context/AuthContext'; 

function safeToDate(val: any): Date | undefined {
  if (!val) return undefined;
  if (typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      return !isNaN(d.getTime()) ? d : undefined;
    } catch {
      return undefined;
    }
  }
  if (val instanceof Date) {
    return !isNaN(val.getTime()) ? val : undefined;
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return !isNaN(d.getTime()) ? d : undefined;
  }
  return undefined;
}

export const useMaintenanceLogs = (vehicleId?: string) => {
  const { user } = useAuth(); 
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until the user object is fully loaded
    if (!user) return;

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

          // Ensure all Timestamp, Date, or string fields are safely converted to JS Date objects
          const date = safeToDate(data.date) || safeToDate(data.createdAt) || new Date();
          const nextServiceDate = safeToDate(data.nextServiceDate);

          logsData.push({
            id: doc.id,
            ...data,
            date: date,
            nextServiceDate: nextServiceDate,
            createdAt: safeToDate(data.createdAt),
            updatedAt: safeToDate(data.updatedAt),
            invoiceDate: safeToDate(data.invoiceDate),
            invoiceDueDate: safeToDate(data.invoiceDueDate),
            completedDate: safeToDate(data.completedDate),
          } as MaintenanceLog);
        });
        setLogs(logsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching maintenance logs:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vehicleId, user]); 

  return { logs, loading, error };
};