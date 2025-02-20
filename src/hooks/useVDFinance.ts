import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VDFinanceRecord } from '../types/vdFinance';

export const useVDFinance = () => {
  const [records, setRecords] = useState<VDFinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'vdFinance'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const recordData: VDFinanceRecord[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          recordData.push({
            id: doc.id,
            ...data,
            date: data.date.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as VDFinanceRecord);
        });
        setRecords(recordData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching VD Finance records:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { records, loading };
};