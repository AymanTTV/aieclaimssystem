// src/hooks/useVATGroups.ts
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category as Group } from '../types/category';

export const useVATGroups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vatGroups'), orderBy('name', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Group[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Group, 'id'>) }));
        setGroups(list);
        setLoading(false);
      },
      (err) => {
        console.error('useVATGroups onSnapshot error', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { groups, loading };
};
