// src/services/financeGroup.service.ts
import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';

export interface FinanceGroup {
  id: string;
  name: string;
  createdAt: Date;
}

const groupsCol = () => collection(db, 'financeGroups');

function snapshotToGroup(docSnap: QueryDocumentSnapshot<DocumentData>): FinanceGroup {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name as string,
    createdAt: (data.createdAt as { toDate: () => Date }).toDate()
  };
}

const financeGroupService = {
  async getAll(): Promise<FinanceGroup[]> {
    const snap = await getDocs(groupsCol());
    return snap.docs.map(snapshotToGroup);
  },

  async create(name: string): Promise<string> {
    const ref = await addDoc(groupsCol(), {
      name,
      createdAt: serverTimestamp()
    });
    return ref.id;
  },

  async update(id: string, name: string): Promise<void> {
    const ref = doc(db, 'financeGroups', id);
    await updateDoc(ref, { name });
  },

  async delete(id: string): Promise<void> {
    const ref = doc(db, 'financeGroups', id);
    await deleteDoc(ref);
  }
};

export default financeGroupService;
