// src/hooks/useShares.ts

import { useEffect, useState } from 'react';
import { ShareRecord } from '../types/share';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useShares() {
  const [records, setRecords] = useState<ShareRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'shares'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as ShareRecord[];
      setRecords(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { records, loading };
}
