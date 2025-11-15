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
          
          // FIX: Conditionally call .toDate() only if the timestamp field exists.
          // This prevents crashes if a customer record is missing optional date fields.
          const processedData = {
            id: doc.id,
            ...data,
            dateOfBirth: data.dateOfBirth ? data.dateOfBirth.toDate() : undefined,
            licenseValidFrom: data.licenseValidFrom ? data.licenseValidFrom.toDate() : undefined,
            licenseExpiry: data.licenseExpiry ? data.licenseExpiry.toDate() : undefined,
            billExpiry: data.billExpiry ? data.billExpiry.toDate() : undefined,
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(), // Added fallback for safety
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(), // Added fallback for safety
          } as Customer;

          customerData.push(processedData);
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