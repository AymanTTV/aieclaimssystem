// src/hooks/useFinancialSync.ts
import { useState, useCallback } from 'react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { syncCrossModuleRecord } from '../services/unifiedSync.service';
import toast from 'react-hot-toast';

export type FinancialEntityType = 'RENTAL' | 'INVOICE' | 'MAINTENANCE';

export interface SaveAndSyncOptions<T = Record<string, any>> {
  entityType: FinancialEntityType;
  data: T;
  id?: string;
  collectionName?: string;
  notifyToast?: boolean;
  toastSuccessMessage?: string;
  toastErrorMessage?: string;
}

export interface SaveAndSyncResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Strips undefined values, functions, and symbols to ensure clean Firestore compatibility.
 */
function cleanFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  if (data === null || data === undefined) return {};
  if (typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.map((item) => (typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (typeof value === 'function' || typeof value === 'symbol') continue;
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      cleaned[key] = cleanFirestoreData(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/**
 * Resolves the default Firestore collection name for a given entity type.
 */
export function getDefaultCollectionForEntity(entityType: FinancialEntityType): string {
  switch (entityType) {
    case 'RENTAL':
      return 'rentals';
    case 'INVOICE':
      return 'invoices';
    case 'MAINTENANCE':
      return 'maintenanceLogs';
    default:
      return 'rentals';
  }
}

/**
 * Standalone function to trigger financial synchronization for a record.
 * Updates the respective collection item and propagates to the Central Finance Ledger.
 */
export async function syncFinancialRecord(
  entityType: FinancialEntityType,
  entityId: string,
  data: Record<string, any>
): Promise<void> {
  if (!entityId) return;
  await syncCrossModuleRecord(entityType, entityId, data);
}

/**
 * Custom React hook for unified financial persistence and synchronization.
 * Can be imported into Rental, Maintenance, and Invoice page components and modals.
 *
 * Provides a unified `saveAndSync` method that persists the form data to its respective
 * collection AND triggers the `syncFinancialRecord` function to update the central Finance Ledger automatically.
 */
export function useFinancialSync() {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  /**
   * Unified save and sync method.
   * Supports both object syntax:
   *   saveAndSync({ entityType: 'RENTAL', data: formData, id: rentalId })
   * and positional arguments:
   *   saveAndSync('RENTAL', formData, rentalId)
   */
  const saveAndSync = useCallback(
    async <T extends Record<string, any>>(
      entityTypeOrOptions: FinancialEntityType | SaveAndSyncOptions<T>,
      dataArg?: T,
      idArg?: string
    ): Promise<SaveAndSyncResult> => {
      setIsSyncing(true);
      setSyncError(null);

      let entityType: FinancialEntityType;
      let rawData: T;
      let docId: string | undefined;
      let collectionName: string;
      let notifyToast = false;
      let successMessage: string | undefined;
      let errorMessage: string | undefined;

      if (typeof entityTypeOrOptions === 'object') {
        entityType = entityTypeOrOptions.entityType;
        rawData = entityTypeOrOptions.data;
        docId = entityTypeOrOptions.id;
        collectionName = entityTypeOrOptions.collectionName || getDefaultCollectionForEntity(entityType);
        notifyToast = entityTypeOrOptions.notifyToast ?? false;
        successMessage = entityTypeOrOptions.toastSuccessMessage;
        errorMessage = entityTypeOrOptions.toastErrorMessage;
      } else {
        entityType = entityTypeOrOptions;
        rawData = (dataArg || {}) as T;
        docId = idArg;
        collectionName = getDefaultCollectionForEntity(entityType);
      }

      try {
        const cleaned = cleanFirestoreData({
          ...rawData,
          updatedAt: new Date(),
        });

        let targetId = docId;

        if (targetId) {
          // Persist update to source collection
          const docRef = doc(db, collectionName, targetId);
          await updateDoc(docRef, cleaned);
        } else {
          // Persist new document to source collection
          const colRef = collection(db, collectionName);
          const newDoc = await addDoc(colRef, {
            ...cleaned,
            createdAt: new Date(),
          });
          targetId = newDoc.id;
        }

        // Trigger central Finance Ledger synchronization automatically
        const isLoan = Boolean(cleaned.isLoan);
        const derivedTransactionType: 'EXPENSE' | 'INCOME' = cleaned.transactionType
          ? (String(cleaned.transactionType).toUpperCase() as 'EXPENSE' | 'INCOME')
          : (entityType === 'MAINTENANCE' || (isLoan && cleaned.loanTransactionType !== 'income'))
          ? 'EXPENSE'
          : 'INCOME';
        cleaned.transactionType = derivedTransactionType;
        cleaned.type = derivedTransactionType === 'EXPENSE' ? 'expense' : 'income';

        console.log(
          `[useFinancialSync Audit] entityType=${entityType}, targetId=${targetId}, isLoan=${isLoan}, loanTransactionType=${cleaned.loanTransactionType} ` +
          `=> verified transactionType="${derivedTransactionType}" before dispatching to central Finance Ledger.`
        );
        await syncFinancialRecord(entityType, targetId, cleaned);

        setLastSyncedAt(new Date());
        setIsSyncing(false);

        if (notifyToast && successMessage) {
          toast.success(successMessage);
        }

        return { id: targetId, success: true };
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to save and synchronize financial record';
        console.error(`[useFinancialSync] Error saving and syncing ${entityType}:`, err);
        setSyncError(errMsg);
        setIsSyncing(false);

        if (notifyToast) {
          toast.error(errorMessage || errMsg);
        }

        return { id: docId || '', success: false, error: errMsg };
      }
    },
    []
  );

  // Convenient typed helpers
  const saveAndSyncRental = useCallback(
    (data: Record<string, any>, id?: string) => saveAndSync('RENTAL', data, id),
    [saveAndSync]
  );

  const saveAndSyncMaintenance = useCallback(
    (data: Record<string, any>, id?: string) => saveAndSync('MAINTENANCE', data, id),
    [saveAndSync]
  );

  const saveAndSyncInvoice = useCallback(
    (data: Record<string, any>, id?: string) => saveAndSync('INVOICE', data, id),
    [saveAndSync]
  );

  return {
    isSyncing,
    syncError,
    lastSyncedAt,
    saveAndSync,
    syncFinancialRecord,
    saveAndSyncRental,
    saveAndSyncMaintenance,
    saveAndSyncInvoice,
  };
}

export default useFinancialSync;
