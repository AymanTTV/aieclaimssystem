import { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SimpleItem { id: string; name: string }

export const usePettyCashCategories = (moduleKey: 'pettyCash' | 'aiePettyCash' = 'pettyCash') => {
  const [categories, setCategories] = useState<SimpleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const col = `${moduleKey}Categories`;

  useEffect(() => {
    const q = query(collection(db, col), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    });
    return () => unsub();
  }, [col]);

  const add = useCallback(async (name: string) => addDoc(collection(db, col), { name }), [col]);
  const rename = useCallback(async (id: string, name: string) => updateDoc(doc(db, col, id), { name }), [col]);
  const remove = useCallback(async (id: string) => deleteDoc(doc(db, col, id)), [col]);

  return { categories, loading, add, rename, remove };
};
