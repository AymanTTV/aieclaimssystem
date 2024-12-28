import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import { ensureValidDate } from '../utils/dateHelpers'; // Ensure this utility exists and is properly implemented

// Utility function to handle conversion of Firebase Timestamp or Date
function ensureValidDate(value: any): Date | null {
  if (!value) return null; // Return null if undefined or null
  if (value.toDate) return value.toDate(); // Firestore Timestamp
  if (value instanceof Date) return value; // Already a Date object
  return null; // For any other invalid formats
}

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
            insuranceExpiry: ensureValidDate(data.insuranceExpiry),
            motExpiry: ensureValidDate(data.motExpiry),
            nslExpiry: ensureValidDate(data.nslExpiry),
            roadTaxExpiry: ensureValidDate(data.roadTaxExpiry),
            lastMaintenance: ensureValidDate(data.lastMaintenance),
            nextMaintenance: ensureValidDate(data.nextMaintenance),
            createdAt: ensureValidDate(data.createdAt),
            updatedAt: ensureValidDate(data.updatedAt),
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
