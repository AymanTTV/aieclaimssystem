// src/hooks/useRentals.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Rental } from '../types';
import { ensureValidDate } from '../utils/dateHelpers';

export const useRentals = (vehicleId?: string) => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'rentals'), orderBy('startDate', 'desc'));
    
    if (vehicleId) {
      q = query(q, where('vehicleId', '==', vehicleId));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rentalData: Rental[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          try {
            // Safely convert Firestore timestamps to dates
            const rental: Rental = {
              id: doc.id,
              ...data,
              startDate: ensureValidDate(data.startDate) || new Date(),
              endDate: ensureValidDate(data.endDate) || new Date(),
              createdAt: ensureValidDate(data.createdAt) || new Date(),
              updatedAt: ensureValidDate(data.updatedAt) || new Date(),

              // ✅ NEW: Add this single field safely. 
              // If data.expectedReturnDate is missing, it stays undefined (doesn't break).
              expectedReturnDate: data.expectedReturnDate ? ensureValidDate(data.expectedReturnDate) : undefined,

              // --- RESTORED YOUR ORIGINAL ROBUST LOGIC ---
              checkOutCondition: data.checkOutCondition ? {
                ...data.checkOutCondition,
                date: ensureValidDate(data.checkOutCondition.date),
                createdAt: ensureValidDate(data.checkOutCondition.createdAt),
              } : undefined,
              
              returnCondition: data.returnCondition ? {
                ...data.returnCondition,
                date: ensureValidDate(data.returnCondition.date),
                createdAt: ensureValidDate(data.returnCondition.createdAt),
              } : undefined,
              
              payments: data.payments ? data.payments.map((p: any) => ({
                ...p,
                date: ensureValidDate(p.date),
                createdAt: ensureValidDate(p.createdAt),
              })) : [],
              
              // Handle optional dates safely (returns null if invalid)
              originalStartDate: ensureValidDate(data.originalStartDate),
              storageStartDate: ensureValidDate(data.storageStartDate),
              storageEndDate: ensureValidDate(data.storageEndDate),
  
              // Handle hireSubstitutionDetails (array) - kept simple as per your old code
              hireSubstitutionDetails: data.hireSubstitutionDetails ? data.hireSubstitutionDetails.map((sub: any) => ({
                ...sub,
                givenAt: ensureValidDate(sub.givenAt),
                expectedReturnAt: ensureValidDate(sub.expectedReturnAt),
                // We leave nested returnCondition as-is (timestamps), 
                // because your UI components (RentalDetails) handle timestamps gracefully.
              })) : [],

              extensionHistory: data.extensionHistory?.map((ext: any) => ({
                ...ext,
                date: ensureValidDate(ext.date) || new Date(),
                previousEndDate: ensureValidDate(ext.previousEndDate) || new Date(),
                newEndDate: ensureValidDate(ext.newEndDate) || new Date(),
              })) || []
            };
            rentalData.push(rental);
          } catch (err) {
            console.error('Error processing rental data:', err);
          }
        });
        setRentals(rentalData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching rentals:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [vehicleId]);

  return { rentals, loading, error };
};