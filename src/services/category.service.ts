import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Category } from '../types/category';

const COL = 'categories';

export async function getAll(): Promise<Category[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }));
}

export async function create(payload: { name: string }): Promise<Category> {
  const ref = await addDoc(collection(db, COL), { name: payload.name });
  return { id: ref.id, name: payload.name };
}

export async function update(
  id: string,
  payload: { name: string }
): Promise<void> {
  const ref = doc(db, COL, id);
  await updateDoc(ref, { name: payload.name });
}

export async function remove(id: string): Promise<void> {
  const ref = doc(db, COL, id);
  await deleteDoc(ref);
}

export default {
  getAll,
  create,
  update,
  delete: remove,
};
