// src/hooks/useLegalHandlers.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LegalHandler } from '../types/legalHandler'; // Assuming this path is correct

export const useLegalHandlers = () => {
  const [legalHandlers, setLegalHandlers] = useState<LegalHandler[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'legalHandlers'), orderBy('name'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const handlersData: LegalHandler[] = [];
        snapshot.forEach((doc) => {
          handlersData.push({
            id: doc.id,
            ...doc.data(),
          } as LegalHandler);
        });
        setLegalHandlers(handlersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching legal handlers:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { legalHandlers, loading };
};