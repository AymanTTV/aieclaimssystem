// src/utils/trashService.ts
import { doc, writeBatch, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface TrashItem {
  id: string; 
  originalCollection: string;
  data: any; 
  deletedAt: Date;
  deletedBy: string;
  displayName: string; 
  // expiresAt removed
}

const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  } else if (
    obj !== null && 
    typeof obj === 'object' && 
    !(obj instanceof Date) && 
    typeof obj.toDate !== 'function' 
  ) {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return obj;
};

export const moveToTrash = async (
  collectionName: string, 
  docId: string, 
  data: any, 
  userId: string, 
  displayName: string
) => {
  const batch = writeBatch(db);
  const originalRef = doc(db, collectionName, docId);
  const trashRef = doc(db, 'trash', docId); 

  const now = new Date();
  const cleanData = removeUndefined(data);

  const trashData: TrashItem = {
    id: docId,
    originalCollection: collectionName,
    data: cleanData,
    deletedAt: now,
    deletedBy: userId,
    displayName: displayName
  };

  batch.set(trashRef, trashData);
  batch.delete(originalRef);

  await batch.commit();
};

export const restoreFromTrash = async (trashDocId: string) => {
  const trashRef = doc(db, 'trash', trashDocId);
  const trashSnap = await getDoc(trashRef);

  if (!trashSnap.exists()) throw new Error("Item not found in trash");

  const trashItem = trashSnap.data() as TrashItem;
  const originalRef = doc(db, trashItem.originalCollection, trashItem.id);

  const batch = writeBatch(db);
  batch.set(originalRef, trashItem.data);
  batch.delete(trashRef);

  await batch.commit();
};

export const permanentlyDelete = async (trashDocId: string) => {
  await deleteDoc(doc(db, 'trash', trashDocId));
};