// src/hooks/useVehicles.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import { ensureValidDate } from '../utils/dateHelpers'; 
import { useAuth } from '../context/AuthContext'; 

export const useVehicles = () => {
  const { user } = useAuth(); 
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ❌ REMOVED: if (!user) return; 
    // Public visitors must be allowed to bypass the auth check to see vehicles!

    const q = query(collection(db, 'vehicles'), orderBy('make'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const vehicleData: Vehicle[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();

          // ✅ SAFELY check user.role. If user is null (public visitor), this safely skips and shows the car.
          if (user && (user as any).role === 'company' && data.assignedGarageId !== user.id) {
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