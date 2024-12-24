import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import { ensureValidDate } from '../utils/dateHelpers';

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
            // Ensure all date fields are valid Date objects
            insuranceExpiry: ensureValidDate(data.insuranceExpiry?.toDate()),
            motExpiry: ensureValidDate(data.motExpiry?.toDate()),
            nslExpiry: ensureValidDate(data.nslExpiry?.toDate()),
            roadTaxExpiry: ensureValidDate(data.roadTaxExpiry?.toDate()),
            lastMaintenance: ensureValidDate(data.lastMaintenance?.toDate()),
            nextMaintenance: ensureValidDate(data.nextMaintenance?.toDate()),
            createdAt: ensureValidDate(data.createdAt?.toDate()),
            updatedAt: ensureValidDate(data.updatedAt?.toDate()),
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