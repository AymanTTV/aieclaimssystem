// src/hooks/useServiceCenters.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase'; // Assuming you have firebase.ts in lib
import { ServiceCenter } from '../utils/serviceCenters'; // Import the interface

export const useServiceCenters = () => {
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'serviceCenters'), orderBy('name', 'asc')); // Order by name for consistent display

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const centersData: ServiceCenter[] = [];
        snapshot.forEach((doc) => {
          centersData.push({
            id: doc.id,
            ...doc.data(),
          } as ServiceCenter);
        });
        setServiceCenters(centersData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching service centers:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup the listener on unmount
  }, []);

  return { serviceCenters, loading, error };
};