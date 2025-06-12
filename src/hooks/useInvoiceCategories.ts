// src/hooks/useInvoiceCategories.ts
import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface InvoiceCategory {
  id: string;
  name: string;
}

export const useInvoiceCategories = () => {
  const [categories, setCategories] = useState<InvoiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Query all categories, ordered alphabetically by name
    const q = query(collection(db, 'invoiceCategories'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const cats: InvoiceCategory[] = [];
        snapshot.forEach((docSnap) => {
          cats.push({
            id: docSnap.id,
            name: docSnap.data().name as string,
          });
        });
        setCategories(cats);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching invoice categories:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addCategory = useCallback(async (name: string) => {
    try {
      await addDoc(collection(db, 'invoiceCategories'), { name: name.trim() });
    } catch (err) {
      console.error('Error adding invoice category:', err);
      throw err;
    }
  }, []);

  const updateCategory = useCallback(async (id: string, name: string) => {
    try {
      const ref = doc(db, 'invoiceCategories', id);
      await updateDoc(ref, { name: name.trim() });
    } catch (err) {
      console.error('Error updating invoice category:', err);
      throw err;
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      const ref = doc(db, 'invoiceCategories', id);
      await deleteDoc(ref);
    } catch (err) {
      console.error('Error deleting invoice category:', err);
      throw err;
    }
  }, []);

  return {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
  };
};
