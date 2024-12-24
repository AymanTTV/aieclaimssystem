import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Claim } from '../types';
import { createFinanceTransaction } from '../utils/financeTransactions';
import toast from 'react-hot-toast';

export const useClaimManagement = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'claims'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const claimsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Claim[];
      
      setClaims(claimsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateClaimStatus = async (
    claim: Claim,
    newStatus: Claim['status'],
    note: string,
    amount?: number
  ) => {
    try {
      const claimRef = doc(db, 'claims', claim.id);
      const now = new Date();
      
      const progressNote = {
        id: Date.now().toString(),
        date: now,
        note,
        author: 'System',
        status: newStatus,
        amount
      };

      await updateDoc(claimRef, {
        status: newStatus,
        claimAmount: amount,
        updatedAt: now,
        progressHistory: [...claim.progressHistory, progressNote]
      });

      // Create finance transaction for settled claims
      if (newStatus === 'settled') {
        await createFinanceTransaction({
          type: claim.claimType === 'fault' ? 'expense' : 'income',
          category: 'claim-settlement',
          amount: amount || 0,
          description: `Claim settlement for ${claim.claimType} claim`,
          referenceId: claim.id,
          vehicleId: claim.accidentId
        });
      }

      toast.success('Claim status updated successfully');
    } catch (error) {
      console.error('Error updating claim:', error);
      toast.error('Failed to update claim status');
    }
  };

  return {
    claims,
    loading,
    updateClaimStatus
  };
};