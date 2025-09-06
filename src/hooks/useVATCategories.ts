// src/hooks/useVATCategories.ts
import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category } from '../types/category';

export const useVATCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vatCategories'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Category[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
      setCategories(list);
      setLoading(false);
    }, (err) => {
      console.error('useVATCategories onSnapshot error', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { categories, loading };
};
