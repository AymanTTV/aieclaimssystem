// src/hooks/useVATRecords.ts

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VATRecord } from '../types/vatRecord';

export const useVATRecords = () => {
  const [records, setRecords] = useState<VATRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vatRecords'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const recordData: VATRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          recordData.push({
            id: doc.id,
            ...data,
            date: data.date.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as VATRecord);
        });
        setRecords(recordData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching VAT records:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { records, loading };
};
