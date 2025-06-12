// src/hooks/useSkylineIncomeExpenses.ts
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { IncomeExpenseEntry } from '../types/incomeExpense';

export function useSkylineIncomeExpenses() {
  const [records, setRecords] = useState<IncomeExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'skylineIncomeExpenses'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
      setRecords(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { records, loading };
}
