// src/hooks/useFinances.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types';

export const useFinances = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const transactionData: Transaction[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          transactionData.push({
            id: doc.id,
            ...data,
            date: data.date.toDate(),
            createdAt: data.createdAt.toDate(),
          } as Transaction);
        });
        console.log('Fetched transactions:', transactionData); // Debug log
        setTransactions(transactionData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching transactions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { transactions, loading, error };
};