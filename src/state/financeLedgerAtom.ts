// src/state/financeLedgerAtom.ts
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types';

export interface FinanceLedgerState {
  version: number;
  lastInvalidatedAt: number;
  deletedPaymentIds: Set<string>;
}

// Global finance ledger state atom
let ledgerState: FinanceLedgerState = {
  version: 1,
  lastInvalidatedAt: Date.now(),
  deletedPaymentIds: new Set<string>(),
};

const listeners = new Set<(state: FinanceLedgerState) => void>();

export const getFinanceLedgerState = (): FinanceLedgerState => ledgerState;

export const subscribeFinanceLedger = (listener: (state: FinanceLedgerState) => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * invalidateFinanceLedgerCache
 * Immediately updates the global state atom, evicts deleted payment records,
 * and notifies all listeners across the Finance Page and other tabs.
 */
export const invalidateFinanceLedgerCache = (deletedPaymentId?: string) => {
  const updatedDeletedIds = new Set(ledgerState.deletedPaymentIds);
  if (deletedPaymentId) {
    updatedDeletedIds.add(String(deletedPaymentId));
  }

  ledgerState = {
    version: ledgerState.version + 1,
    lastInvalidatedAt: Date.now(),
    deletedPaymentIds: updatedDeletedIds,
  };

  listeners.forEach((listener) => listener(ledgerState));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('financeRecordUpdated', {
        detail: {
          deletedPaymentId,
          action: 'DELETE_PAYMENT',
          timestamp: Date.now(),
          version: ledgerState.version,
        },
      })
    );
  }
};

/**
 * manuallyRefetchFinanceLedger
 * Directly queries Firestore `transactions` collection to force a fresh re-fetch
 * of all transactions without waiting on websocket / snapshot latency.
 */
export const manuallyRefetchFinanceLedger = async (): Promise<Transaction[]> => {
  try {
    const qTx = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const snap = await getDocs(qTx);
    const txs: Transaction[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
      } as Transaction;
    });

    // Notify listeners of the refreshed state
    invalidateFinanceLedgerCache();
    return txs;
  } catch (err) {
    console.error('Failed to manually refetch finance ledger:', err);
    return [];
  }
};
