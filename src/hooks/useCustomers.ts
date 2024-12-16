import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer } from '../types/customer';

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('name'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const customerData: Customer[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          customerData.push({
            id: doc.id,
            ...data,
            dateOfBirth: data.dateOfBirth.toDate(),
            licenseValidFrom: data.licenseValidFrom.toDate(),
            licenseExpiry: data.licenseExpiry.toDate(),
            billExpiry: data.billExpiry.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as Customer);
        });
        setCustomers(customerData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching customers:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { customers, loading };
};