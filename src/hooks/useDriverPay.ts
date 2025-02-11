// src/hooks/useDriverPay.ts

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DriverPay } from '../types/driverPay';
import { ensureValidDate } from '../utils/dateHelpers';

export const useDriverPay = () => {
  const [records, setRecords] = useState<DriverPay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'driverPay'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const driverPayData: DriverPay[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          try {
            // Convert all date fields using ensureValidDate
            const record: DriverPay = {
              id: doc.id,
              ...data,
              startDate: ensureValidDate(data.startDate),
              endDate: ensureValidDate(data.endDate),
              createdAt: ensureValidDate(data.createdAt),
              updatedAt: ensureValidDate(data.updatedAt),
              // Convert dates in payments array if it exists
              payments: data.payments?.map((payment: any) => ({
                ...payment,
                date: ensureValidDate(payment.date),
                createdAt: ensureValidDate(payment.createdAt)
              })) || []
            };
            driverPayData.push(record);
          } catch (error) {
            console.error('Error processing driver pay record:', error);
          }
        });
        setRecords(driverPayData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching driver pay records:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { records, loading };
};
