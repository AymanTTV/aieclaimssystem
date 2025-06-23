// src/services/finance.service.ts
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Transaction } from '../types/finance';

const TRANSACTIONS_COLLECTION = 'transactions';  // ← change if you use a different path

export default {
  /**
   * Partially update a Transaction document (e.g. to set groupId)
   */
  async updateTransaction(
    id: string,
    data: Partial<Transaction>
  ): Promise<void> {
    const ref = doc(db, TRANSACTIONS_COLLECTION, id);
    await updateDoc(ref, data);
  }
};
