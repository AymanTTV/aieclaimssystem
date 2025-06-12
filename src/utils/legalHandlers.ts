// src/utils/legalHandlers.ts

import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';
import { LegalHandler } from '../types/legalHandler';

const LEGAL_HANDLERS_COLLECTION = 'legalHandlers';

export const fetchLegalHandlers = async (): Promise<LegalHandler[]> => {
  const q = query(collection(db, LEGAL_HANDLERS_COLLECTION), orderBy('name', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }) as LegalHandler);
};

export const searchLegalHandlers = async (queryText: string): Promise<LegalHandler[]> => {
  if (!queryText) {
    return fetchLegalHandlers();
  }
  const allHandlers = await fetchLegalHandlers(); // Fetch all and filter client-side
  const lowerCaseQuery = queryText.toLowerCase();
  return allHandlers.filter(handler =>
    handler.name.toLowerCase().includes(lowerCaseQuery) ||
    handler.email.toLowerCase().includes(lowerCaseQuery) ||
    handler.address.toLowerCase().includes(lowerCaseQuery) ||
    handler.phone.toLowerCase().includes(lowerCaseQuery)
  );
};

export const addLegalHandler = async (handlerData: Omit<LegalHandler, 'id'>): Promise<LegalHandler> => {
  const docRef = await addDoc(collection(db, LEGAL_HANDLERS_COLLECTION), handlerData);
  return { id: docRef.id, ...handlerData };
};

export const updateLegalHandler = async (id: string, updates: Partial<LegalHandler>): Promise<void> => {
  const handlerRef = doc(db, LEGAL_HANDLERS_COLLECTION, id);
  await updateDoc(handlerRef, updates);
};

export const deleteLegalHandler = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, LEGAL_HANDLERS_COLLECTION, id));
};