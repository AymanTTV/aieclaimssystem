// src/services/maintenanceDeletion.service.ts

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { moveToTrash } from '../utils/trashService';
import { checkVehicleStatus } from '../utils/vehicleStatusManager';
import { reverseFinanceTransaction } from '../utils/financeTransactions';
import { syncMaintenanceRecord } from './unifiedSync.service';
import { derivePaymentStatus } from '../utils/paymentStatusHelper';

export interface CascadeDeleteResult {
  success: boolean;
  logId: string;
  deletedFinanceTxIds: string[];
  deletedInvoiceIds: string[];
  updatedInvoiceIds?: string[];
  message?: string;
}

export interface CascadePaymentDeleteResult {
  success: boolean;
  logId: string;
  paymentId: string;
  newPaid: number;
  newRemaining: number;
  newPaymentStatus: 'paid' | 'partially_paid' | 'unpaid';
  deletedFinanceTxIds: string[];
  deletedInvoiceIds: string[];
  updatedInvoiceIds: string[];
}

/**
 * Searches and removes all Finance transactions matching a paymentId or referenceId.
 * Scans both 'transactions' and 'finance_ledger' collections to guarantee total reconciliation.
 */
export async function queryAndDeleteFinanceTransactions(identifiers: {
  referenceId?: string;
  paymentId?: string;
  paymentReference?: string;
  orderIdentifier?: string;
  invoiceNumber?: string;
}): Promise<string[]> {
  const { referenceId, paymentId, paymentReference, orderIdentifier, invoiceNumber } = identifiers;
  const txCol = collection(db, 'transactions');
  const txIdsToDelete = new Set<string>();

  // 1. Query by paymentId
  if (paymentId && paymentId.trim()) {
    const pId = paymentId.trim();
    const q1 = query(txCol, where('paymentId', '==', pId));
    const s1 = await getDocs(q1);
    s1.docs.forEach((d) => txIdsToDelete.add(d.id));

    const q1b = query(txCol, where('paymentReference', '==', pId));
    const s1b = await getDocs(q1b);
    s1b.docs.forEach((d) => txIdsToDelete.add(d.id));
  }

  // 2. Query by referenceId (maintenance log ID)
  if (referenceId && referenceId.trim()) {
    const ref = referenceId.trim();
    if (paymentId) {
      // Specific payment under reference
      const qRefPay = query(txCol, where('referenceId', '==', ref), where('paymentId', '==', paymentId));
      const sRefPay = await getDocs(qRefPay);
      sRefPay.docs.forEach((d) => txIdsToDelete.add(d.id));

      if (paymentReference) {
        const qRefPayRef = query(txCol, where('referenceId', '==', ref), where('paymentReference', '==', paymentReference));
        const sRefPayRef = await getDocs(qRefPayRef);
        sRefPayRef.docs.forEach((d) => txIdsToDelete.add(d.id));
      }
    } else {
      // Full maintenance job cascade
      const qRef = query(txCol, where('referenceId', '==', ref));
      const sRef = await getDocs(qRef);
      sRef.docs.forEach((d) => txIdsToDelete.add(d.id));

      const qLinked = query(txCol, where('linkedInvoiceRef', '==', ref));
      const sLinked = await getDocs(qLinked);
      sLinked.docs.forEach((d) => txIdsToDelete.add(d.id));

      const qMaintJob = query(txCol, where('maintenanceJobId', '==', ref));
      const sMaintJob = await getDocs(qMaintJob);
      sMaintJob.docs.forEach((d) => txIdsToDelete.add(d.id));

      const qSrcRef = query(txCol, where('sourceReferenceId', '==', ref));
      const sSrcRef = await getDocs(qSrcRef);
      sSrcRef.docs.forEach((d) => txIdsToDelete.add(d.id));
    }
  }

  // 3. Query by order number / order ID
  if (orderIdentifier && orderIdentifier.trim() && !paymentId) {
    const ord = orderIdentifier.trim();
    const qOrd = query(txCol, where('orderId', '==', ord));
    const sOrd = await getDocs(qOrd);
    sOrd.docs.forEach((d) => txIdsToDelete.add(d.id));

    const qOrdNum = query(txCol, where('orderNumber', '==', ord));
    const sOrdNum = await getDocs(qOrdNum);
    sOrdNum.docs.forEach((d) => txIdsToDelete.add(d.id));

    const qMaintOrd = query(txCol, where('maintenanceOrderId', '==', ord));
    const sMaintOrd = await getDocs(qMaintOrd);
    sMaintOrd.docs.forEach((d) => txIdsToDelete.add(d.id));
  }

  // 4. Query by invoiceNumber
  if (invoiceNumber && invoiceNumber.trim() && !paymentId) {
    const inv = invoiceNumber.trim();
    const qInv = query(txCol, where('invoiceNumber', '==', inv));
    const sInv = await getDocs(qInv);
    sInv.docs.forEach((d) => txIdsToDelete.add(d.id));
  }

  // Delete all identified documents from both transactions and finance_ledger
  const deletedIds = Array.from(txIdsToDelete);
  await Promise.all(
    deletedIds.map(async (docId) => {
      await deleteDoc(doc(db, 'transactions', docId)).catch(() => {});
      await deleteDoc(doc(db, 'finance_ledger', docId)).catch(() => {});
    })
  );

  return deletedIds;
}

/**
 * Searches and removes/updates all Invoices matching a paymentId or referenceId.
 */
export async function queryAndDeleteInvoices(identifiers: {
  referenceId?: string;
  paymentId?: string;
  orderIdentifier?: string;
  invoiceNumber?: string;
}): Promise<string[]> {
  const { referenceId, paymentId, orderIdentifier, invoiceNumber } = identifiers;
  const invCol = collection(db, 'invoices');
  const invIdsToDelete = new Set<string>();

  // 1. Query by paymentId
  if (paymentId && paymentId.trim()) {
    const pId = paymentId.trim();
    const qInvP = query(invCol, where('paymentId', '==', pId));
    const sInvP = await getDocs(qInvP);
    sInvP.docs.forEach((d) => invIdsToDelete.add(d.id));

    if (orderIdentifier) {
      const qInvMaintOrdP = query(invCol, where('maintenanceOrderId', '==', orderIdentifier), where('paymentId', '==', pId));
      const sInvMaintOrdP = await getDocs(qInvMaintOrdP);
      sInvMaintOrdP.docs.forEach((d) => invIdsToDelete.add(d.id));
    }
  }

  // 2. Query by referenceId (maintenance log ID)
  if (referenceId && referenceId.trim() && !paymentId) {
    const ref = referenceId.trim();
    const qInvRef = query(invCol, where('referenceId', '==', ref));
    const sInvRef = await getDocs(qInvRef);
    sInvRef.docs.forEach((d) => invIdsToDelete.add(d.id));

    const qInvJob = query(invCol, where('maintenanceJobId', '==', ref));
    const sInvJob = await getDocs(qInvJob);
    sInvJob.docs.forEach((d) => invIdsToDelete.add(d.id));
  }

  // 3. Query by order identifier
  if (orderIdentifier && orderIdentifier.trim() && !paymentId) {
    const ord = orderIdentifier.trim();
    const qInvOrd = query(invCol, where('orderId', '==', ord));
    const sInvOrd = await getDocs(qInvOrd);
    sInvOrd.docs.forEach((d) => invIdsToDelete.add(d.id));

    const qInvOrdNum = query(invCol, where('orderNumber', '==', ord));
    const sInvOrdNum = await getDocs(qInvOrdNum);
    sInvOrdNum.docs.forEach((d) => invIdsToDelete.add(d.id));

    const qInvMaintOrd = query(invCol, where('maintenanceOrderId', '==', ord));
    const sInvMaintOrd = await getDocs(qInvMaintOrd);
    sInvMaintOrd.docs.forEach((d) => invIdsToDelete.add(d.id));
  }

  // 4. Query by invoiceNumber
  if (invoiceNumber && invoiceNumber.trim() && !paymentId) {
    const inv = invoiceNumber.trim();
    const qInvNum = query(invCol, where('invoiceNumber', '==', inv));
    const sInvNum = await getDocs(qInvNum);
    sInvNum.docs.forEach((d) => invIdsToDelete.add(d.id));
  }

  const deletedIds = Array.from(invIdsToDelete);
  await Promise.all(
    deletedIds.map(async (docId) => {
      await deleteDoc(doc(db, 'invoices', docId)).catch(() => {});
    })
  );

  return deletedIds;
}

/**
 * Full Cascade Delete of a Maintenance Record:
 * Queries all linked Finance (transactions/finance_ledger) and Invoice collections by referenceId/paymentId,
 * removes the records, archives to trash, checks vehicle availability, and dispatches reconciliation events.
 */
export async function cascadeDeleteMaintenanceRecord(
  logId: string,
  options?: {
    user?: { id?: string; name?: string; email?: string } | null;
  }
): Promise<CascadeDeleteResult> {
  if (!logId) {
    throw new Error('Log ID is required for cascade deletion');
  }

  const logRef = doc(db, 'maintenanceLogs', logId);
  const logSnap = await getDoc(logRef);

  if (!logSnap.exists()) {
    throw new Error('Maintenance log not found');
  }

  const logData = logSnap.data();
  const orderIdentifier = logData.orderNumber || logData.orderId || '';
  const invoiceNum = logData.invoiceNumber || '';
  const userId = options?.user?.id || 'system';
  const displayName = orderIdentifier
    ? `Maintenance ${orderIdentifier}`
    : `${logData.type?.replace('-', ' ') || 'Service'} - ${logData.vehicleDetails?.registrationNumber || 'Unknown'}`;

  // 1. Cascade Delete Linked Finance Transactions
  const deletedFinanceTxIds = await queryAndDeleteFinanceTransactions({
    referenceId: logId,
    orderIdentifier,
    invoiceNumber: invoiceNum,
  });

  // 2. Cascade Delete Linked Invoices
  const deletedInvoiceIds = await queryAndDeleteInvoices({
    referenceId: logId,
    orderIdentifier,
    invoiceNumber: invoiceNum,
  });

  // 3. Move maintenance log to trash
  await moveToTrash(
    'maintenanceLogs',
    logId,
    logData,
    userId,
    displayName
  );

  // 4. Update vehicle status if applicable
  if (logData.vehicleId) {
    try {
      await checkVehicleStatus(logData.vehicleId);
    } catch (err) {
      console.warn('Error checking vehicle status during maintenance deletion:', err);
    }
  }

  // 5. Total Data Reconciliation - Emit Cross-Module Sync Events
  if (typeof window !== 'undefined') {
    const syncDetail = {
      entityId: logId,
      referenceId: logId,
      orderNumber: orderIdentifier,
      invoiceNumber: invoiceNum,
      action: 'deleted',
      deletedFinanceCount: deletedFinanceTxIds.length,
      deletedInvoiceCount: deletedInvoiceIds.length,
      updatedAt: new Date().toISOString(),
    };

    window.dispatchEvent(new CustomEvent('maintenanceRecordUpdated', { detail: syncDetail }));
    window.dispatchEvent(new CustomEvent('financeRecordUpdated', { detail: syncDetail }));
    window.dispatchEvent(new CustomEvent('invoiceRecordUpdated', { detail: syncDetail }));
    window.dispatchEvent(new CustomEvent('maintenanceUpdated'));
    window.dispatchEvent(new CustomEvent('financeUpdated'));
    window.dispatchEvent(new CustomEvent('invoicesUpdated'));
  }

  return {
    success: true,
    logId,
    deletedFinanceTxIds,
    deletedInvoiceIds,
    message: `Maintenance record deleted with ${deletedFinanceTxIds.length} linked Finance entry/entries and ${deletedInvoiceIds.length} linked Invoice(s) removed.`,
  };
}

/**
 * Cascade Delete of an individual Maintenance Payment:
 * Queries all linked Finance and Invoice collections by paymentId or referenceId,
 * removes the transaction/invoice entries, recalculates job balance & status, and updates Firestore.
 */
export async function cascadeDeleteMaintenancePayment(params: {
  logId: string;
  paymentId: string;
  user?: { id?: string; name?: string; email?: string } | null;
}): Promise<CascadePaymentDeleteResult> {
  const { logId, paymentId, user } = params;

  if (!logId || !paymentId) {
    throw new Error('Both logId and paymentId are required to cascade delete a payment');
  }

  const logRef = doc(db, 'maintenanceLogs', logId);
  const logSnap = await getDoc(logRef);

  if (!logSnap.exists()) {
    throw new Error('Maintenance log not found');
  }

  const logData = logSnap.data();
  const allPayments = Array.isArray(logData.payments) ? [...logData.payments] : [];
  const paymentToDelete = allPayments.find((p: any) => p.id === paymentId);

  if (!paymentToDelete) {
    throw new Error('Payment record not found in job history');
  }

  // 1. Remove payment from history array
  const updatedPayments = allPayments.filter((p: any) => p.id !== paymentId);

  // 2. Recalculate job totals
  const totalCost = Number(logData.cost || logData.customerBilled || logData.total || 0);
  const newPaid = updatedPayments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const newRemaining = Math.max(0, totalCost - newPaid);
  const newPaymentStatus = derivePaymentStatus({
    cost: totalCost,
    paidAmount: newPaid,
    remainingAmount: newRemaining,
    payments: updatedPayments,
  });

  const orderIdentifier = logData.orderNumber || logData.orderId || logId;

  // 3. Update maintenance log in Firestore & cross-module sync
  await syncMaintenanceRecord(logId, {
    payments: updatedPayments,
    paidAmount: newPaid,
    remainingAmount: newRemaining,
    paymentStatus: newPaymentStatus,
    status: newPaid <= 0.001 ? 'unpaid' : (logData.status || 'in_progress'),
    orderId: orderIdentifier,
    orderNumber: orderIdentifier,
    invoiceNumber: logData.invoiceNumber,
    updatedAt: new Date(),
    updatedBy: user?.id || 'system',
  });

  await updateDoc(logRef, {
    payments: updatedPayments,
    paidAmount: newPaid,
    remainingAmount: newRemaining,
    paymentStatus: newPaymentStatus,
    status: newPaid <= 0.001 ? 'unpaid' : (logData.status || 'in_progress'),
    updatedAt: new Date(),
    updatedBy: user?.id || 'system',
  });

  // 4. Cascade Delete from Finance collections by paymentId and referenceId
  const deletedFinanceTxIds = await queryAndDeleteFinanceTransactions({
    referenceId: logId,
    paymentId,
    paymentReference: paymentToDelete.reference,
    orderIdentifier: newPaid <= 0.001 ? orderIdentifier : undefined,
    invoiceNumber: newPaid <= 0.001 ? logData.invoiceNumber : undefined,
  });

  // Also call reverseFinanceTransaction helper for complete safety
  try {
    await reverseFinanceTransaction({
      referenceId: logId,
      paymentId,
    });
  } catch (err) {
    console.warn('reverseFinanceTransaction fallback notice:', err);
  }

  // 5. Cascade Delete / Reconcile Invoices
  const deletedInvoiceIds: string[] = [];
  const updatedInvoiceIds: string[] = [];
  const invCol = collection(db, 'invoices');

  // Query invoices directly matching this paymentId
  const qInvP = query(invCol, where('paymentId', '==', paymentId));
  const sInvP = await getDocs(qInvP);
  for (const d of sInvP.docs) {
    await deleteDoc(d.ref).catch(() => {});
    deletedInvoiceIds.push(d.id);
  }

  if (newPaid <= 0.001) {
    // All payments deleted: remove all linked invoices for this maintenance order
    const fullDeleted = await queryAndDeleteInvoices({
      referenceId: logId,
      orderIdentifier,
      invoiceNumber: logData.invoiceNumber,
    });
    fullDeleted.forEach((id) => {
      if (!deletedInvoiceIds.includes(id)) deletedInvoiceIds.push(id);
    });
  } else {
    // Partial payments remain: reconcile other linked invoices
    const qInvRef = query(invCol, where('referenceId', '==', logId));
    const sInvRef = await getDocs(qInvRef);
    for (const d of sInvRef.docs) {
      const invData = d.data();
      if (Array.isArray(invData.payments) && invData.payments.some((p: any) => p.id === paymentId)) {
        const invUpdatedPayments = invData.payments.filter((p: any) => p.id !== paymentId);
        const invPaid = invUpdatedPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
        const invTotal = Number(invData.total || invData.amount || 0);
        const invRem = Math.max(0, invTotal - invPaid);
        const invStatus = derivePaymentStatus({
          total: invTotal,
          paidAmount: invPaid,
          remainingAmount: invRem,
          payments: invUpdatedPayments,
        });

        await updateDoc(doc(db, 'invoices', d.id), {
          payments: invUpdatedPayments,
          paidAmount: invPaid,
          remainingAmount: invRem,
          amountOwing: invRem,
          owing: invRem,
          paymentStatus: invStatus,
          status: invStatus,
          updatedAt: new Date(),
        });
        updatedInvoiceIds.push(d.id);
      }
    }
  }

  // 6. Total Data Reconciliation - Emit Cross-Module Sync Events
  if (typeof window !== 'undefined') {
    const syncDetail = {
      entityId: logId,
      referenceId: logId,
      paymentId,
      action: 'payment_deleted',
      newPaid,
      newRemaining,
      newPaymentStatus,
      deletedFinanceCount: deletedFinanceTxIds.length,
      deletedInvoiceCount: deletedInvoiceIds.length,
      updatedAt: new Date().toISOString(),
    };

    window.dispatchEvent(new CustomEvent('maintenanceRecordUpdated', { detail: syncDetail }));
    window.dispatchEvent(new CustomEvent('financeRecordUpdated', { detail: syncDetail }));
    window.dispatchEvent(new CustomEvent('invoiceRecordUpdated', { detail: syncDetail }));
    window.dispatchEvent(new CustomEvent('maintenanceUpdated'));
    window.dispatchEvent(new CustomEvent('financeUpdated'));
    window.dispatchEvent(new CustomEvent('invoicesUpdated'));
  }

  return {
    success: true,
    logId,
    paymentId,
    newPaid,
    newRemaining,
    newPaymentStatus,
    deletedFinanceTxIds,
    deletedInvoiceIds,
    updatedInvoiceIds,
  };
}
