import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';

export const useVehicles = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'vehicles'), orderBy('make'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const vehicleData: Vehicle[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          vehicleData.push({
            id: doc.id,
            ...data,
            insuranceExpiry: data.insuranceExpiry.toDate(),
            lastMaintenance: data.lastMaintenance.toDate(),
            nextMaintenance: data.nextMaintenance.toDate(),
          } as Vehicle);
        });
        setVehicles(vehicleData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { vehicles, loading, error };
};