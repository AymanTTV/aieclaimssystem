// src/hooks/useFinances.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types';

const safeDate = (dateVal: any) => {
  if (!dateVal) return new Date();
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (dateVal instanceof Date) return dateVal;
  return new Date(dateVal);
};

export const useFinances = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Pre-allocate array size for much faster memory mapping
        const transactionData = new Array(snapshot.docs.length);
        
        snapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          transactionData[index] = {
            id: doc.id,
            ...data,
            date: safeDate(data.date),
            createdAt: safeDate(data.createdAt),
          } as Transaction;
        });
        
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