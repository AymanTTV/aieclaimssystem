// src/hooks/useProfitShares.ts

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ProfitShare } from '../types/incomeExpense';

export function useProfitShares(collectionName: string = 'profitShares') {
  const [shares, setShares] = useState<ProfitShare[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, collectionName), (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      }) as ProfitShare);

      setShares(data);
      setLoading(false);
    });

    return () => unsub();
  }, [collectionName]);

  return { shares, loading };
}
