// src/hooks/useMaintenanceLogs.ts

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MaintenanceLog } from '../types';
import { useAuth } from '../context/AuthContext'; 

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

          // ✅ SECURITY RULE Note: The strict company filter has been moved to 
          // `useMaintenanceFilters.ts` to intelligently cross-check against assigned vehicles.
          
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
            createdAt: data.createdAt ? data.createdAt.toDate() : undefined,
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
            invoiceDate: data.invoiceDate ? data.invoiceDate.toDate() : undefined,
            invoiceDueDate: data.invoiceDueDate ? data.invoiceDueDate.toDate() : undefined,
            completedDate: data.completedDate ? data.completedDate.toDate() : undefined,
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
  }, [vehicleId, user]); 

  return { logs, loading, error };
};