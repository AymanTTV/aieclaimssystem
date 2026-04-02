// src/hooks/useVehicles.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import { ensureValidDate } from '../utils/dateHelpers'; 
import { useAuth } from '../context/AuthContext'; // ✅ Import Auth context

export const useVehicles = () => {
  const { user } = useAuth(); // ✅ Get logged in user
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return; // Wait until auth is loaded

    const q = query(collection(db, 'vehicles'), orderBy('make'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const vehicleData: Vehicle[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();

          // ✅ SECURITY RULE: If the user has a 'company' role, 
          // filter out any vehicle that isn't explicitly assigned to their user ID.
          if (user.role === 'company' && data.assignedGarageId !== user.id) {
             return; 
          }

          vehicleData.push({
            id: doc.id,
            ...data,
            insuranceExpiry: ensureValidDate(data.insuranceExpiry),
            motExpiry: ensureValidDate(data.motExpiry),
            nslExpiry: ensureValidDate(data.nslExpiry),
            roadTaxExpiry: ensureValidDate(data.roadTaxExpiry),
            lastMaintenance: ensureValidDate(data.lastMaintenance),
            nextMaintenance: ensureValidDate(data.nextMaintenance),
            createdAt: ensureValidDate(data.createdAt),
            updatedAt: ensureValidDate(data.updatedAt),
            purchasedDate: ensureValidDate(data.purchasedDate),
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
  }, [user]);

  return { vehicles, loading, error };
};