// src/hooks/useVDFinanceGroups.ts
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type VDFinanceGroup = { id: string; name: string };

export const useVDFinanceGroups = () => {
  const [groups, setGroups] = useState<VDFinanceGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vdFinanceGroups'), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setGroups(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VDFinanceGroup, 'id'>) }))
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  return { groups, loading };
};
