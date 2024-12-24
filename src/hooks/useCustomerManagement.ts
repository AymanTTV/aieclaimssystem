import { useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { checkDocumentExpiry } from '../utils/documentManager';
import toast from 'react-hot-toast';

export const useCustomerManagement = () => {
  useEffect(() => {
    const customersQuery = query(collection(db, 'customers'));

    return onSnapshot(customersQuery, snapshot => {
      snapshot.docChanges().forEach(change => {
        const customer = change.doc.data();
        
        // Check document expiry
        const { expired, expiring } = checkDocumentExpiry({
          licenseExpiry: customer.licenseExpiry.toDate(),
          billExpiry: customer.billExpiry.toDate()
        });

        if (expired.length > 0) {
          toast.error(`${customer.name}: Expired documents - ${expired.join(', ')}`);
        }

        if (expiring.length > 0) {
          toast.warning(`${customer.name}: Documents expiring soon - ${expiring.join(', ')}`);
        }
      });
    });
  }, []);
};