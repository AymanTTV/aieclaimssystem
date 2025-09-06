// src/services/vatGroup.service.ts
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category as Group } from '../types/category';

const COL = 'vatGroups';

export async function getAll(): Promise<Group[]> {
  const q = query(collection(db, COL), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Group, 'id'>) }));
}

export async function create(payload: Omit<Group, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), payload);
  return ref.id;
}

export async function update(id: string, payload: Omit<Group, 'id'>): Promise<void> {
  const ref = doc(db, COL, id);
  await updateDoc(ref, payload);
}

export async function remove(id: string): Promise<void> {
  const ref = doc(db, COL, id);
  await deleteDoc(ref);
}

export default { getAll, create, update, delete: remove };
