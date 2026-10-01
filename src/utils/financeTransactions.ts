// src/utils/financeTransactions.ts

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  query,
  setDoc,
  updateDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MaintenanceLog, Vehicle } from '../types';
import toast from 'react-hot-toast';
import { getOrderCandidateVariants } from './maintenanceFinanceLink';
import { invalidateFinanceLedgerCache, manuallyRefetchFinanceLedger } from '../state/financeLedgerAtom';

interface FinanceTransactionParams {
  type: 'income' | 'expense' | 'EXPENSE' | 'INCOME';
  transactionType?: 'EXPENSE' | 'INCOME';
  entryType?: 'DEBIT' | 'CREDIT';
  category: string;
  amount: number;
  netAmount?: number;
  vatAmount?: number;
  description: string;
  referenceId: string;
  sourceReferenceId?: string; // ✅ Strict UPSERT link field
  maintenanceJobId?: string;
  maintenanceOrderId?: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleOwner?: {
    name: string;
    isDefault: boolean;
  };
  status?: 'pending' | 'completed' | 'cancelled';
  paymentMethod?: string;
  paymentReference?: string;
  paymentId?: string; // ✅ Dedicated system link field
  paymentStatus?: 'paid' | 'partially_paid' | 'unpaid' | 'expense';
  date?: Date;
  accountFrom?: string;
  accountTo?: string;
  accountsFrom?: string[]; 
  accountsTo?: string[];   
  customerId?: string;
  customerName?: string;
  groupId?: string; 
  groupName?: string; 
  departmentId?: string; 
  departmentName?: string; 
  subcontractorCost?: number;
  dealerCost?: number;
  customerBilled?: number;
  netProfit?: number;
  profitMarginPercent?: number;
  isProfitEdited?: boolean;
  isEdited?: boolean;
  linkedInvoiceRef?: string;
  invoiceId?: string;
  entityId?: string;
  entityType?: 'RENTAL' | 'INVOICE' | 'MAINTENANCE';
  orderId?: string;
  orderNumber?: string;
  invoiceNumber?: string;
}

function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || obj === undefined) return {};
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (typeof (obj as any).toMillis === 'function') return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? sanitizeForFirestore(item) : item));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (typeof value === 'function' || typeof value === 'symbol') continue;
    if (value && typeof value === 'object' && !(value instanceof Date) && typeof (value as any).toMillis !== 'function') {
      cleaned[key] = sanitizeForFirestore(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function reverseFinanceTransaction(params: {
  referenceId: string;
  paymentId: string;
  invoiceId?: string;
  amount?: number;
}) {
  const { referenceId, paymentId, invoiceId, amount } = params;
  try {
    const txRef = collection(db, 'transactions');
    const matchedDocIds = new Set<string>();

    // 1. Direct check if doc ID is paymentId
    if (paymentId) {
      try {
        const directDoc = await getDoc(doc(db, 'transactions', paymentId));
        if (directDoc.exists()) {
          matchedDocIds.add(paymentId);
        }
      } catch {}

      // 2. Query by paymentId field (string)
      const qPay = query(txRef, where('paymentId', '==', String(paymentId)));
      const snapPay = await getDocs(qPay);
      snapPay.docs.forEach((d) => matchedDocIds.add(d.id));

      // As number if applicable
      const numPayId = Number(paymentId);
      if (!isNaN(numPayId) && String(numPayId) === String(paymentId)) {
        const qPayNum = query(txRef, where('paymentId', '==', numPayId));
        const snapPayNum = await getDocs(qPayNum);
        snapPayNum.docs.forEach((d) => matchedDocIds.add(d.id));
      }

      // Query by paymentReference
      const qPayRef = query(txRef, where('paymentReference', '==', String(paymentId)));
      const snapPayRef = await getDocs(qPayRef);
      snapPayRef.docs.forEach((d) => matchedDocIds.add(d.id));
    }

    // 3. Fallback queries by invoice reference identifiers
    const targetInvoiceId = invoiceId || referenceId;
    if (targetInvoiceId) {
      const candidateQueries = [
        query(txRef, where('invoiceId', '==', targetInvoiceId)),
        query(txRef, where('linkedInvoiceRef', '==', targetInvoiceId)),
        query(txRef, where('sourceReferenceId', '==', targetInvoiceId)),
        query(txRef, where('entityId', '==', targetInvoiceId)),
        query(txRef, where('referenceId', '==', targetInvoiceId)),
      ];

      for (const qCand of candidateQueries) {
        const snap = await getDocs(qCand);
        for (const d of snap.docs) {
          const data = d.data();
          const pId = data.paymentId ? String(data.paymentId) : '';
          const pRef = data.paymentReference ? String(data.paymentReference) : '';
          const desc = data.description ? String(data.description) : '';

          if (
            (paymentId && (pId === String(paymentId) || pRef === String(paymentId) || d.id === String(paymentId) || desc.includes(String(paymentId)))) ||
            (amount !== undefined && amount > 0 && String(data.type || '').toLowerCase() === 'income' && Math.abs(Number(data.amount || data.paid || 0) - amount) < 0.01)
          ) {
            matchedDocIds.add(d.id);
          }
        }
      }
    }

    // Purge matched transactions from Firestore collections
    for (const id of matchedDocIds) {
      await deleteDoc(doc(db, 'transactions', id)).catch(() => {});
      await deleteDoc(doc(db, 'finance_ledger', id)).catch(() => {});
    }

    // Purge from backend server payment ledger
    try {
      if (targetInvoiceId && paymentId) {
        await fetch(`/api/invoices/${targetInvoiceId}/payments/${paymentId}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
      if (paymentId) {
        await fetch(`/api/finance/invoice-payments/${paymentId}`, {
          method: 'DELETE',
        }).catch(() => {});
      }
    } catch {}

    // Invalidate finance ledger global cache atom & trigger re-fetch
    invalidateFinanceLedgerCache(paymentId);
    await manuallyRefetchFinanceLedger().catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            entityId: targetInvoiceId,
            deletedPaymentId: paymentId,
            paymentId,
            action: 'DELETE_PAYMENT',
            timestamp: Date.now(),
          },
        })
      );
    }

    toast.success('Finance transaction removed');
  } catch (err) {
    console.error('Failed to reverse finance transaction', err);
    toast.error('Could not reverse finance transaction');
    throw err;
  }
}

/**
 * purgeFinanceTransactionsForInvoice
 * Deletes all transactions and ledger entries linked to an invoice when the invoice is deleted.
 */
export async function purgeFinanceTransactionsForInvoice(invoiceId: string) {
  if (!invoiceId) return;
  try {
    const txRef = collection(db, 'transactions');
    const matchedDocIds = new Set<string>();

    const queries = [
      query(txRef, where('invoiceId', '==', invoiceId)),
      query(txRef, where('linkedInvoiceRef', '==', invoiceId)),
      query(txRef, where('sourceReferenceId', '==', invoiceId)),
      query(txRef, where('entityId', '==', invoiceId)),
      query(txRef, where('referenceId', '==', invoiceId)),
    ];

    for (const q of queries) {
      const snap = await getDocs(q);
      snap.docs.forEach((d) => matchedDocIds.add(d.id));
    }

    try {
      const directDoc = await getDoc(doc(db, 'transactions', invoiceId));
      if (directDoc.exists()) {
        matchedDocIds.add(invoiceId);
      }
    } catch {}

    for (const id of matchedDocIds) {
      await deleteDoc(doc(db, 'transactions', id)).catch(() => {});
      await deleteDoc(doc(db, 'finance_ledger', id)).catch(() => {});
    }

    invalidateFinanceLedgerCache(invoiceId);
    await manuallyRefetchFinanceLedger().catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            entityId: invoiceId,
            action: 'DELETE_INVOICE',
            timestamp: Date.now(),
          },
        })
      );
    }
  } catch (err) {
    console.error('Failed to purge finance transactions for invoice:', err);
  }
}

export const createMaintenanceTransaction = async (
  maintenanceLog: MaintenanceLog,
  vehicle: Vehicle,
  amount: number,
  paymentMethod: string,
  paymentReference?: string
) => {
  if (!maintenanceLog.id || !amount || !vehicle) {
    console.error('Missing required fields for maintenance transaction');
    toast.error('Missing required fields for transaction');
    return;
  }

  const transactionsRef = collection(db, 'transactions');
  const dupQuery = query(
    transactionsRef,
    where('referenceId', '==', maintenanceLog.id),
    where('category', '==', maintenanceLog.type)
  );
  const dupSnap = await getDocs(dupQuery);
  if (!dupSnap.empty) {
    console.warn('Transaction for this maintenance log already exists.');
    toast.error('Transaction for this maintenance log already exists.');
    return;
  }

  const transaction: Record<string, any> = {
    type: 'expense',
    category: maintenanceLog.type,
    amount,
    netAmount: maintenanceLog.netAmount,
    vatAmount: maintenanceLog.vatAmount,
    description: maintenanceLog.description,
    referenceId: maintenanceLog.id,
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`,
    paymentStatus: 'paid',
    date: new Date(),
    createdAt: new Date(),
    createdBy: 'system',
    ...(paymentMethod && { paymentMethod }),
    ...(vehicle.assignedGroupId && { groupId: vehicle.assignedGroupId }) 
  };

  if (vehicle.owner) {
    transaction.vehicleOwner = {
      name: vehicle.owner.name,
      isDefault: vehicle.owner.isDefault ?? false
    };
  }

  if (paymentReference) {
    transaction.paymentReference = paymentReference;
  }

  try {
    await addDoc(collection(db, 'transactions'), transaction);
    toast.success('Maintenance transaction created successfully!');
  } catch (error) {
    console.error('Error creating maintenance transaction:', error);
    toast.error('Failed to create maintenance transaction');
  }
};

export const createFinanceTransaction = async (params: FinanceTransactionParams) => {
  const {
    type,
    category,
    amount,
    netAmount,
    vatAmount,
    description,
    referenceId,
    vehicleId,
    vehicleName,
    vehicleOwner,
    status = 'completed',
    paymentMethod,
    paymentReference,
    paymentStatus,
    date,
    accountFrom,
    accountTo,
    accountsFrom,
    accountsTo: paramsAccountsTo, 
    customerId,
    customerName,
    groupId,
    groupName, 
    departmentId, 
    departmentName 
  } = params;

  try {
    const finalAccountsFrom = accountsFrom || (accountFrom ? [accountFrom] : []);
    const finalAccountsTo = paramsAccountsTo || (accountTo ? [accountTo] : []);

    if (type === ('transfer' as any)) {
      if (finalAccountsFrom.length === 0 || finalAccountsTo.length === 0) {
        toast.error('Transfer requires both from and to accounts');
        return { success: false };
      }
      const fromRef = doc(db, 'accounts', finalAccountsFrom[0]);
      const toRef = doc(db, 'accounts', finalAccountsTo[0]);
      const [fromSnap, toSnap] = await Promise.all([getDoc(fromRef), getDoc(toRef)]);
      if (fromSnap.exists() && toSnap.exists()) {
        const fromData = fromSnap.data();
        const toData = toSnap.data();
        await updateDoc(fromRef, { balance: fromData.balance - amount, updatedAt: new Date() });
        await updateDoc(toRef,   { balance: toData.balance + amount,   updatedAt: new Date() });
      } else {
        toast.error('One or both accounts not found for transfer');
        return { success: false };
      }
    } else {
      for (const fromId of finalAccountsFrom) {
        const fromRef = doc(db, 'accounts', fromId);
        const fromSnap = await getDoc(fromRef);
        if (fromSnap.exists()) {
          const fromData = fromSnap.data();
          await updateDoc(fromRef, {
            balance: type === 'income' ? fromData.balance + amount : fromData.balance - amount,
            updatedAt: new Date()
          });
        }
      }
      for (const toId of finalAccountsTo) {
        const toRef = doc(db, 'accounts', toId);
        const toSnap = await getDoc(toRef);
        if (toSnap.exists()) {
          const toData = toSnap.data();
          await updateDoc(toRef, {
            balance: type === 'income' ? toData.balance + amount : toData.balance - amount,
            updatedAt: new Date()
          });
        }
      }
    }

    const normalizedType = String(type || 'expense').toLowerCase() === 'income' ? 'income' : 'expense';
    const transactionType = params.transactionType 
      ? (String(params.transactionType).toUpperCase() as 'EXPENSE' | 'INCOME')
      : (normalizedType === 'income' ? 'INCOME' : 'EXPENSE');

    const entryType: 'DEBIT' | 'CREDIT' = params.entryType
      ? (String(params.entryType).toUpperCase() as 'DEBIT' | 'CREDIT')
      : (transactionType === 'EXPENSE' || normalizedType === 'expense' ? 'DEBIT' : 'CREDIT');

    const resolvedInvoiceNum =
      params.invoiceNumber ||
      (paymentReference && (paymentReference.startsWith('INV') || paymentReference.startsWith('inv') || paymentReference.startsWith('#'))
        ? paymentReference.replace(/^#/, '')
        : undefined);

    const candidatePaymentId = params.paymentId?.trim();
    const candidateSourceRefId = (params.sourceReferenceId || params.referenceId)?.trim();
    const targetOrderId = (params.orderId || params.orderNumber || params.maintenanceOrderId)?.trim();
    const candidateVariants = targetOrderId ? getOrderCandidateVariants(targetOrderId) : [];

    const isMaintenanceExpense = (transactionType === 'EXPENSE' || normalizedType === 'expense' || entryType === 'DEBIT') && Boolean(
      params.entityType === 'MAINTENANCE' ||
      params.category?.toLowerCase() === 'maintenance' ||
      params.maintenanceJobId ||
      params.maintenanceOrderId ||
      Boolean(targetOrderId) ||
      (candidateVariants && candidateVariants.length > 0) ||
      Boolean(candidateSourceRefId)
    );

    const transaction: Record<string, any> = {
      type: isMaintenanceExpense ? 'expense' : normalizedType,
      transactionType: isMaintenanceExpense ? 'EXPENSE' : transactionType,
      entryType: isMaintenanceExpense ? 'DEBIT' : entryType,
      category,
      amount,
      description,
      referenceId,
      ...(candidateSourceRefId && { sourceReferenceId: candidateSourceRefId }),
      ...(params.maintenanceJobId && { maintenanceJobId: params.maintenanceJobId }),
      ...(params.maintenanceOrderId && { maintenanceOrderId: params.maintenanceOrderId }),
      status,
      date: date || new Date(),
      createdAt: new Date(),
      ...(netAmount !== undefined && { netAmount }),
      ...(vatAmount !== undefined && { vatAmount }),
      ...(vehicleId        && { vehicleId }),
      ...(vehicleName      && { vehicleName }),
      ...(vehicleOwner     && { vehicleOwner }),
      ...(paymentMethod    && { paymentMethod }),
      ...(paymentReference && { paymentReference }), // ✅ Saves human readable invoice ref
      ...(params.paymentId && { paymentId: params.paymentId }), // ✅ Explicitly saves system ID for deletion linking
      ...(paymentStatus    && { paymentStatus }),
      accountsFrom: finalAccountsFrom, 
      accountsTo: finalAccountsTo,     
      ...(customerId       && { customerId }),
      ...(customerName     && { customerName }),
      ...(groupId          && { groupId }),
      ...(groupName        && { groupName }), 
      ...(departmentId     && { departmentId }), 
      ...(departmentName   && { departmentName }),
      ...(params.subcontractorCost !== undefined && { subcontractorCost: params.subcontractorCost }),
      ...(params.dealerCost !== undefined || params.subcontractorCost !== undefined
        ? { dealerCost: params.dealerCost ?? params.subcontractorCost }
        : {}),
      ...(params.customerBilled !== undefined && { customerBilled: params.customerBilled }),
      ...(params.netProfit !== undefined && { netProfit: params.netProfit }),
      ...(params.profitMarginPercent !== undefined && { profitMarginPercent: params.profitMarginPercent }),
      ...(params.isProfitEdited !== undefined && {
        isProfitEdited: params.isProfitEdited,
        isEdited: params.isProfitEdited,
      }),
      linkedInvoiceRef: params.linkedInvoiceRef || referenceId,
      ...(params.invoiceId ? { invoiceId: params.invoiceId } : params.linkedInvoiceRef ? { invoiceId: params.linkedInvoiceRef } : (params.entityType === 'INVOICE' && referenceId) ? { invoiceId: referenceId } : {}),
      ...(params.entityId ? { entityId: params.entityId } : referenceId ? { entityId: referenceId } : {}),
      ...(params.entityType ? { entityType: params.entityType } : params.linkedInvoiceRef ? { entityType: 'INVOICE' } : {}),
      ...((params.orderId || params.orderNumber || targetOrderId) && {
        orderId: targetOrderId,
        orderNumber: targetOrderId,
      }),
      ...(resolvedInvoiceNum && {
        invoiceNumber: resolvedInvoiceNum,
      })
    };

    if (isMaintenanceExpense) {
      transaction.type = 'expense';
      transaction.transactionType = 'EXPENSE';
      transaction.entryType = 'DEBIT';
      const billedVal = params.customerBilled !== undefined ? Number(params.customerBilled) : amount;
      const dealerVal = params.dealerCost !== undefined ? Number(params.dealerCost) : (params.subcontractorCost !== undefined ? Number(params.subcontractorCost) : undefined);
      transaction.customerBilled = billedVal;
      if (dealerVal !== undefined) {
        transaction.dealerCost = dealerVal;
        transaction.subcontractorCost = dealerVal;
        const profit = params.netProfit !== undefined ? Number(params.netProfit) : Number((billedVal - dealerVal).toFixed(2));
        transaction.netProfit = profit;
        transaction.profitMarginPercent = params.profitMarginPercent !== undefined ? Number(params.profitMarginPercent) : (billedVal > 0 ? Number(((profit / billedVal) * 100).toFixed(1)) : 0);
        transaction.isProfitEdited = true;
        transaction.isEdited = true;
      }
    }

    const resolvedInvId = transaction.invoiceId || params.invoiceId || params.linkedInvoiceRef;

    console.log(
      `[FinanceLedger Audit] [createFinanceTransaction] Committing transaction: ` +
      `orderId = "${targetOrderId || 'N/A'}", invoiceId = "${resolvedInvId || 'N/A'}", invoiceNumber = "${resolvedInvoiceNum || 'N/A'}", transactionType = "${transactionType}", entryType = "${entryType}", type = "${normalizedType}", category = "${category}", amount = ${amount}, ref = "${referenceId}"`
    );

    // ===================================================================
    // SINGLE SOURCE OF TRUTH & UPSERT ENFORCEMENT
    // Check Before Insert: Before adding any transaction to the Finance Ledger,
    // check if an entry already exists for orderId === maintenance.orderId AND type === 'EXPENSE'.
    // If Found: UPDATE the existing Expense record in-place.
    // If Not Found: INSERT a single new Expense record.
    // Delete/Purge Orphaned Income Entries: Clean up and remove any existing Income entries tied to Maintenance Order #A1.
    // ===================================================================
    let existingTxDocId: string | null = null;
    const txCol = collection(db, 'transactions');

    // 1. Search for existing EXPENSE entry matching orderId / orderNumber
    if (isMaintenanceExpense && candidateVariants.length > 0) {
      for (const variant of candidateVariants) {
        try {
          const qByOrd = query(txCol, where('orderId', '==', variant));
          const snapByOrd = await getDocs(qByOrd);
          const expMatch = snapByOrd.docs.find(d => {
            const dData = d.data();
            const dType = (dData.type || '').toLowerCase();
            const dTxType = (dData.transactionType || '').toUpperCase();
            return dType === 'expense' || dTxType === 'EXPENSE';
          });
          if (expMatch) {
            existingTxDocId = expMatch.id;
            break;
          }

          const qByOrdNum = query(txCol, where('orderNumber', '==', variant));
          const snapByOrdNum = await getDocs(qByOrdNum);
          const expMatchNum = snapByOrdNum.docs.find(d => {
            const dData = d.data();
            const dType = (dData.type || '').toLowerCase();
            const dTxType = (dData.transactionType || '').toUpperCase();
            return dType === 'expense' || dTxType === 'EXPENSE';
          });
          if (expMatchNum) {
            existingTxDocId = expMatchNum.id;
            break;
          }
        } catch {
          // Continue scanning
        }
      }
    }

    // 2. Search by paymentId if present and not yet found
    if (!existingTxDocId && candidatePaymentId) {
      const qPay = query(txCol, where('paymentId', '==', candidatePaymentId));
      const snapPay = await getDocs(qPay);
      if (!snapPay.empty) {
        existingTxDocId = snapPay.docs[0].id;
      } else {
        const qPayRef = query(txCol, where('paymentReference', '==', candidatePaymentId));
        const snapPayRef = await getDocs(qPayRef);
        if (!snapPayRef.empty) {
          existingTxDocId = snapPayRef.docs[0].id;
        }
      }
    }

    // 2b. If searching for an invoice payment by (invoiceId + paymentReference)
    if (!existingTxDocId && params.paymentReference && (params.invoiceId || candidateSourceRefId)) {
      const targetInvId = params.invoiceId || candidateSourceRefId;
      const qInvPay = query(
        txCol,
        where('invoiceId', '==', targetInvId),
        where('paymentReference', '==', params.paymentReference)
      );
      const snapInvPay = await getDocs(qInvPay);
      const match = snapInvPay.docs.find(d => {
        const dData = d.data();
        return (dData.type || '').toLowerCase() === 'income';
      });
      if (match) {
        existingTxDocId = match.id;
      }
    }

    // 3. Search by sourceReferenceId / referenceId if present and not yet found
    // CRITICAL: ONLY run this fallback search when candidatePaymentId is NOT provided!
    // Never allow a payment to match the parent invoice document or overwrite non-payment records!
    if (!existingTxDocId && candidateSourceRefId && !candidatePaymentId) {
      const qSrcRef = query(txCol, where('sourceReferenceId', '==', candidateSourceRefId));
      const snapSrcRef = await getDocs(qSrcRef);
      if (!snapSrcRef.empty) {
        const match = snapSrcRef.docs.find(d => {
          const dData = d.data();
          if (isMaintenanceExpense) {
            const dType = (dData.type || '').toLowerCase();
            const dTxType = (dData.transactionType || '').toUpperCase();
            const dEntryType = (dData.entryType || '').toUpperCase();
            return dType === 'expense' || dTxType === 'EXPENSE' || dEntryType === 'DEBIT';
          }
          if (dData.paymentId) {
            return false;
          }
          return true;
        });
        if (match) {
          existingTxDocId = match.id;
        }
      } else {
        const qRefId = query(txCol, where('referenceId', '==', candidateSourceRefId));
        const snapRefId = await getDocs(qRefId);
        if (!snapRefId.empty) {
          const match = snapRefId.docs.find(d => {
            const dData = d.data();
            if (isMaintenanceExpense) {
              const dType = (dData.type || '').toLowerCase();
              const dTxType = (dData.transactionType || '').toUpperCase();
              const dEntryType = (dData.entryType || '').toUpperCase();
              return dType === 'expense' || dTxType === 'EXPENSE' || dEntryType === 'DEBIT';
            }
            if (dData.paymentId) {
              return false;
            }
            if (params.category && dData.category && dData.category !== params.category) {
              return false;
            }
            return true;
          });
          if (match) {
            existingTxDocId = match.id;
          }
        }
      }
    }

    // ===================================================================
    // DELETE / PURGE ORPHANED INCOME ENTRIES
    // Clean up and remove any existing Income entries tied to Maintenance Order #A1
    // (or any maintenance job) to eliminate double-entry duplication.
    // ===================================================================
    if (isMaintenanceExpense) {
      try {
        const orphanedIncomeDocIds = new Set<string>();

        // Check by order candidate variants
        for (const variant of candidateVariants) {
          try {
            const qOrdInc = query(txCol, where('orderId', '==', variant));
            const snapOrdInc = await getDocs(qOrdInc);
            snapOrdInc.docs.forEach(d => {
              const dData = d.data();
              const dType = (dData.type || '').toLowerCase();
              const dTxType = (dData.transactionType || '').toUpperCase();
              const dEntryType = (dData.entryType || '').toUpperCase();
              if (dType === 'income' || dTxType === 'INCOME' || dEntryType === 'CREDIT') {
                orphanedIncomeDocIds.add(d.id);
              }
            });

            const qOrdNumInc = query(txCol, where('orderNumber', '==', variant));
            const snapOrdNumInc = await getDocs(qOrdNumInc);
            snapOrdNumInc.docs.forEach(d => {
              const dData = d.data();
              const dType = (dData.type || '').toLowerCase();
              const dTxType = (dData.transactionType || '').toUpperCase();
              const dEntryType = (dData.entryType || '').toUpperCase();
              if (dType === 'income' || dTxType === 'INCOME' || dEntryType === 'CREDIT') {
                orphanedIncomeDocIds.add(d.id);
              }
            });
          } catch {}
        }

        // Check by referenceId / sourceReferenceId matching maintenance log ID
        if (candidateSourceRefId) {
          try {
            const qRefInc = query(txCol, where('referenceId', '==', candidateSourceRefId));
            const snapRefInc = await getDocs(qRefInc);
            snapRefInc.docs.forEach(d => {
              const dData = d.data();
              const dType = (dData.type || '').toLowerCase();
              const dTxType = (dData.transactionType || '').toUpperCase();
              const dEntryType = (dData.entryType || '').toUpperCase();
              if (dType === 'income' || dTxType === 'INCOME' || dEntryType === 'CREDIT') {
                orphanedIncomeDocIds.add(d.id);
              }
            });

            const qLinkedInc = query(txCol, where('linkedInvoiceRef', '==', candidateSourceRefId));
            const snapLinkedInc = await getDocs(qLinkedInc);
            snapLinkedInc.docs.forEach(d => {
              const dData = d.data();
              const dType = (dData.type || '').toLowerCase();
              const dTxType = (dData.transactionType || '').toUpperCase();
              const dEntryType = (dData.entryType || '').toUpperCase();
              if (dType === 'income' || dTxType === 'INCOME' || dEntryType === 'CREDIT') {
                orphanedIncomeDocIds.add(d.id);
              }
            });
          } catch {}
        }

        // Specifically search and purge Order #A1 income entries
        try {
          const allTxSnap = await getDocs(query(txCol));
          allTxSnap.docs.forEach(d => {
            const dData = d.data();
            const dType = (dData.type || '').toLowerCase();
            const dTxType = (dData.transactionType || '').toUpperCase();
            const dEntryType = (dData.entryType || '').toUpperCase();
            const isInc = dType === 'income' || dTxType === 'INCOME' || dEntryType === 'CREDIT';
            if (!isInc) return;
            // Never purge legitimate invoice payments
            if (dData.paymentId || dData.entityType === 'INVOICE' || dData.invoiceId || dData.isInvoicePayment) return;

            const oVal = String(dData.orderId || dData.orderNumber || dData.maintenanceOrderId || '').trim().toLowerCase();
            const desc = String(dData.description || '').toLowerCase();
            const cat = String(dData.category || '').toLowerCase();
            const isA1 =
              oVal === 'a1' ||
              oVal === '#a1' ||
              oVal.includes('a1') ||
              desc.includes('order: #a1') ||
              desc.includes('order: a1') ||
              desc.includes('order #a1') ||
              desc.includes('order a1') ||
              desc.includes('#a1');

            const isMaint =
              cat === 'maintenance' ||
              dData.entityType === 'MAINTENANCE' ||
              desc.includes('maintenance job') ||
              desc.includes('maintenance expense') ||
              Boolean(dData.maintenanceJobId);

            if (isA1 || isMaint) {
              orphanedIncomeDocIds.add(d.id);
            }
          });
        } catch {}

        for (const orphanId of orphanedIncomeDocIds) {
          console.log(`[FinanceLedger Purge] Purging orphaned Income transaction ${orphanId} tied to maintenance order ${targetOrderId || candidateSourceRefId || 'A1'}`);
          await deleteDoc(doc(db, 'transactions', orphanId)).catch(() => {});
          try {
            await deleteDoc(doc(db, 'finance_ledger', orphanId)).catch(() => {});
          } catch {}
        }
      } catch (purgeErr) {
        console.warn('Error purging orphaned maintenance income entries:', purgeErr);
      }
    }

    if (existingTxDocId) {
      // UPDATE in-place: do not insert a duplicate row!
      console.log(`[FinanceLedger UPSERT] Updating existing Finance entry in-place: docId = ${existingTxDocId}`);
      const updatePayload = sanitizeForFirestore({
        ...transaction,
        id: existingTxDocId,
        updatedAt: new Date()
      });
      await updateDoc(doc(db, 'transactions', existingTxDocId), updatePayload);
      try {
        await setDoc(
          doc(db, 'finance_ledger', existingTxDocId),
          {
            id: existingTxDocId,
            ...(resolvedInvId ? { invoiceId: resolvedInvId } : {}),
            ...updatePayload
          },
          { merge: true }
        );
      } catch {
        // ignore
      }
      return { success: true, id: existingTxDocId, isUpdate: true };
    }

    // If Not Found: INSERT a new Finance entry
    const sanitizedNew = sanitizeForFirestore(transaction);
    const docRef = await addDoc(collection(db, 'transactions'), sanitizedNew);
    try {
      await setDoc(
        doc(db, 'finance_ledger', docRef.id),
        {
          id: docRef.id,
          ...(resolvedInvId ? { invoiceId: resolvedInvId } : {}),
          ...sanitizedNew
        },
        { merge: true }
      );
    } catch {
      // ignore
    }
    return { success: true, id: docRef.id, isUpdate: false };
  } catch (error) {
    console.error('Error creating finance transaction:', error);
    toast.error('Failed to create transaction');
    return { success: false };
  }
};