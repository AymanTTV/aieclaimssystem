import React, { createContext, useContext, useEffect, useState } from 'react';
import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';

type VehicleContextType = {
  vehicles: Vehicle[];
  loading: boolean;
};

const VehicleContext = createContext<VehicleContextType | undefined>(undefined);

export const VehicleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const vehiclesRef = collection(db, 'vehicles');
    
    // Set up a real-time listener
    const unsubscribe = onSnapshot(vehiclesRef, (snapshot) => {
      const updatedVehicles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Vehicle[];
      setVehicles(updatedVehicles);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching vehicles:', error);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  return (
    <VehicleContext.Provider value={{ vehicles, loading }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehiclesContext = (): VehicleContextType => {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehiclesContext must be used within a VehicleProvider');
  }
  return context;
};
