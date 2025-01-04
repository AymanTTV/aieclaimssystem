// src/hooks/useInvoices.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice } from '../types';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const invoiceData: Invoice[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          invoiceData.push({
            id: doc.id,
            ...data,
            date: data.date.toDate(),
            dueDate: data.dueDate.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as Invoice);
        });
        setInvoices(invoiceData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching invoices:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { invoices, loading };
};
