// src/hooks/useClaims.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Claim } from '../types/claim'; // Assuming this path is correct
import { ensureValidDate } from '../utils/dateHelpers'; // Assuming this utility exists

export const useClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'claims'), orderBy('createdAt', 'desc')); // Assuming 'createdAt' exists for ordering

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const claimsData: Claim[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          claimsData.push({
            id: doc.id,
            ...data,
            dateOfIncident: ensureValidDate(data.dateOfIncident),
            dateOfClaim: ensureValidDate(data.dateOfClaim),
            fileHandlers: {
              aieHandler: data.fileHandlers?.aieHandler || '',
              legalHandler: data.fileHandlers?.legalHandler || null,
            },
            recovery: data.recovery ? {
              ...data.recovery,
              date: ensureValidDate(data.recovery.date),
            } : undefined,
            storage: data.storage ? {
              ...data.storage,
              startDate: ensureValidDate(data.storage.startDate),
              endDate: ensureValidDate(data.storage.endDate),
            } : undefined,
            progressHistory: data.progressHistory?.map((historyItem: any) => ({
              ...historyItem,
              date: ensureValidDate(historyItem.date),
            })) || [],
            createdAt: ensureValidDate(data.createdAt),
            updatedAt: ensureValidDate(data.updatedAt),
          } as Claim);
        });
        setClaims(claimsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching claims:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { claims, loading };
};