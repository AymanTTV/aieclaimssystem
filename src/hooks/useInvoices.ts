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
          
          // Safe date parser to prevent crashes on missing/malformed dates
          const safeDate = (dateVal: any) => {
            if (!dateVal) return new Date();
            if (typeof dateVal.toDate === 'function') return dateVal.toDate();
            if (dateVal instanceof Date) return dateVal;
            return new Date(dateVal);
          };

          invoiceData.push({
            id: doc.id,
            ...data,
            date: safeDate(data.date),
            dueDate: safeDate(data.dueDate),
            createdAt: safeDate(data.createdAt),
            updatedAt: safeDate(data.updatedAt),
            payments: data.payments || [], // Ensure payments array exists
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