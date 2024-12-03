import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types';

export const useFinances = (type?: 'income' | 'expense', period?: 'week' | 'month' | 'year') => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    
    if (type) {
      q = query(q, where('type', '==', type));
    }

    if (period) {
      const now = new Date();
      let startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      q = query(q, where('date', '>=', startDate));
    }

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
          } as Transaction);
        });
        setTransactions(transactionData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [type, period]);

  return { transactions, loading, error };
};