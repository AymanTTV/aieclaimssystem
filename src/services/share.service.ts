// src/services/share.service.ts

import { db } from '../lib/firebase';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc 
} from 'firebase/firestore';
import { ShareRecord } from '../types/share';

const sharesCol = collection(db, 'shares');

export const createShare = (record: Omit<
  ShareRecord,
  | 'id'
  | 'legalFeeCost'
  | 'vHireAmount'
  | 'totalNet'
  | 'aieSkylineAmount'
  | 'abdulAzizAmount'
  | 'jayAmount'
>) => addDoc(sharesCol, record);

export const updateShare = (id: string, updates: Partial<ShareRecord>) =>
  updateDoc(doc(db, 'shares', id), updates);

export const deleteShare = (id: string) =>
  deleteDoc(doc(db, 'shares', id));
