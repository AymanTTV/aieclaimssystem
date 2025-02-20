// src/hooks/useAiePettyCash.ts

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PettyCashTransaction } from '../types/pettyCash';

export const useAiePettyCash = () => {
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'aiePettyCash'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transactionData: PettyCashTransaction[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          transactionData.push({
            id: doc.id,
            ...data,
            date: data.date.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as PettyCashTransaction);
        });
        setTransactions(transactionData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching AIE petty cash transactions:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { transactions, loading };
};
