import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types';

export const useFinanceTracking = () => {
  useEffect(() => {
    const transactionsQuery = query(collection(db, 'transactions'));

    return onSnapshot(transactionsQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const transaction = { id: change.doc.id, ...change.doc.data() } as Transaction;
        
        if (change.type === 'added') {
          // Update related records
          if (transaction.type === 'income' && transaction.category === 'rental') {
            updateRentalPaymentStatus(transaction.referenceId!, 'paid');
          }
        }
      });
    });
  }, []);
};