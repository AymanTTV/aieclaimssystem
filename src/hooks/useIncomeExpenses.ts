// src/hooks/useIncomeExpenses.ts

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { IncomeExpenseEntry } from '../types/incomeExpense';

export function useIncomeExpenses(collectionName: string = 'incomeExpenses') {
  const [records, setRecords] = useState<IncomeExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, collectionName), snapshot => {
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
