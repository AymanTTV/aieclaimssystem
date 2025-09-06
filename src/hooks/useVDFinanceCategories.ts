// src/hooks/useVDFinanceCategories.ts
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type VDFinanceCategory = { id: string; name: string };

export const useVDFinanceCategories = () => {
  const [categories, setCategories] = useState<VDFinanceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vdFinanceCategories'), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCategories(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VDFinanceCategory, 'id'>) }))
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  return { categories, loading };
};
