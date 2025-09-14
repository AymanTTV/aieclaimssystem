import { useEffect, useMemo, useState } from 'react';
import {
  addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { WaitingCategory, WaitingEntry, WaitingGroup, WaitingStatus } from '../types/waiting';

function toDate(x: any): Date | null {
  if (!x) return null;
  if (x instanceof Date) return x;
  if (typeof x?.toDate === 'function') return x.toDate();
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}

export function useWaitingCategories() {
  const [categories, setCategories] = useState<WaitingCategory[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'waiting_categories'), orderBy('name')), snap => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) || new Date(0) })) as any);
    });
    return () => unsub();
  }, []);
  return { categories };
}

export function useWaitingGroups() {
  const [groups, setGroups] = useState<WaitingGroup[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'waiting_groups'), orderBy('name')), snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) || new Date(0) })) as any);
    });
    return () => unsub();
  }, []);
  return { groups };
}

export interface WaitingFilters {
  status?: WaitingStatus | 'all';
  categoryId?: string | 'all';
  groupId?: string | 'all';
  assignedTo?: string | 'all';
  fromDate?: Date | null;
  toDate?: Date | null;
}

export function useWaitingEntries(filters?: WaitingFilters) {
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'waiting_entries'), orderBy('createdAt', 'desc')), snap => {
      const list = snap.docs.map(d => {
        const data: any = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: toDate(data.createdAt) || new Date(0),
          updatedAt: toDate(data.updatedAt) || new Date(0),
          lastActivityAt: toDate(data.lastActivityAt),
          dateWanted: toDate(data.dateWanted),
          offerExpiryAt: toDate(data.offerExpiryAt),
        } as WaitingEntry;
      });
      setEntries(list);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const f = filters || {};
    return entries.filter(e => {
      if (f.status && f.status !== 'all' && e.status !== f.status) return false;
      if (f.categoryId && f.categoryId !== 'all' && !(e.categoryIds || []).includes(f.categoryId)) return false;
      if (f.groupId && f.groupId !== 'all' && !(e.groupIds || []).includes(f.groupId)) return false;
      if (f.assignedTo && f.assignedTo !== 'all' && e.assignedTo !== f.assignedTo) return false;
      if (f.fromDate && e.createdAt && e.createdAt < f.fromDate) return false;
      if (f.toDate && e.createdAt && e.createdAt > f.toDate) return false;
      return true;
    });
  }, [entries, filters]);

  return { entries: filtered };
}

// handy CRUD wrappers (use if you want)
export async function createWaitingEntry(payload: Omit<WaitingEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  const ref = collection(db, 'waiting_entries');
  const docRef = await addDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastActivityAt: serverTimestamp() });
  return docRef.id;
}

export async function updateWaitingEntry(id: string, patch: Partial<WaitingEntry>) {
  const ref = doc(db, 'waiting_entries', id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}
