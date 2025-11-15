// src/services/financeAccount.service.ts
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Account } from '../types';

const COL = 'accounts';

export async function getAll(): Promise<Account[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Account, 'id'>) }));
}

export async function create(payload: { name: string }): Promise<Account> {
  const ref = await addDoc(collection(db, COL), { 
      name: payload.name,
      balance: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
  });
  return { id: ref.id, name: payload.name, balance: 0, createdAt: new Date(), updatedAt: new Date() };
}

export async function update(
  id: string,
  payload: { name: string }
): Promise<void> {
  const ref = doc(db, COL, id);
  await updateDoc(ref, { 
      name: payload.name,
      updatedAt: serverTimestamp(),
  });
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
