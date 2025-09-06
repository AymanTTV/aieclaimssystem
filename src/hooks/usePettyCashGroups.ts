import { useEffect, useState, useCallback } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { SimpleItem } from './usePettyCashCategories';

export const usePettyCashGroups = (moduleKey: 'pettyCash' | 'aiePettyCash' = 'pettyCash') => {
  const [groups, setGroups] = useState<SimpleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const col = `${moduleKey}Groups`;

  useEffect(() => {
    const q = query(collection(db, col), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
      setLoading(false);
    });
    return () => unsub();
  }, [col]);

  const add = useCallback(async (name: string) => addDoc(collection(db, col), { name }), [col]);
  const rename = useCallback(async (id: string, name: string) => updateDoc(doc(db, col, id), { name }), [col]);
  const remove = useCallback(async (id: string) => deleteDoc(doc(db, col, id)), [col]);

  return { groups, loading, add, rename, remove };
};
