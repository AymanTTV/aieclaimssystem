// src/hooks/useIncomeExpenses.ts

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { IncomeExpenseEntry } from '../types/incomeExpense';

export function useIncomeExpenses(collectionName: string = 'incomeExpenses') {
  const [records, setRecords] = useState<IncomeExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Added orderBy('date', 'desc') to ensure newest records appear first
    const q = query(collection(db, collectionName), orderBy('date', 'desc'));

    const unsub = onSnapshot(q, snapshot => {
      const all: IncomeExpenseEntry[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as IncomeExpenseEntry));

      setRecords(all);
      setLoading(false);
    });

    return () => unsub();
  }, [collectionName]);

  return { records, loading };
}