// src/services/vatCategory.service.ts
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category } from '../types/category';

const COL = 'vatCategories';

export async function getAll(): Promise<Category[]> {
  const q = query(collection(db, COL), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
}

export async function create(payload: Omit<Category, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, COL), payload);
  return ref.id;
}

export async function update(id: string, payload: Omit<Category, 'id'>): Promise<void> {
  const ref = doc(db, COL, id);
  await updateDoc(ref, payload);
}

export async function remove(id: string): Promise<void> {
  const ref = doc(db, COL, id);
  await deleteDoc(ref);
}

export default { getAll, create, update, delete: remove };
