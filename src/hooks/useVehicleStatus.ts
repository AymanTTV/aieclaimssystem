import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import { updateStatus } from '../utils/vehicleStatusManager';

export const useVehicleStatus = (vehicleId: string) => {
  const [status, setStatus] = useState<Vehicle['status']>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'vehicles', vehicleId),
      (doc) => {
        if (doc.exists()) {
          setStatus(doc.data().status);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vehicleId]);

  const update = (newStatus: Vehicle['status'], refId?: string) => {
    return updateStatus(vehicleId, newStatus, refId);
  };

  return { status, loading, update };
};