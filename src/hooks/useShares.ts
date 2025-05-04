// src/hooks/useShares.ts

import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { ShareRecord } from '../types/share';

export const useShares = () => {
  const [shares, setShares] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'shares'), (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ShareRecord, 'id'>),
      }));
      setShares(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { shares, loading };
};
