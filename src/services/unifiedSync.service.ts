// src/services/unifiedSync.service.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateProfitMetrics, ProfitMetrics } from '../utils/profitCalculator';
import {
  getOrderCandidateVariants,
  isMaintenanceOrderMatch,
} from '../utils/maintenanceFinanceLink';
import {
  normalizePaymentStatus,
  normalizeCompletionStatus,
} from '../utils/centralFinanceSync';
import { invalidateFinanceLedgerCache } from '../state/financeLedgerAtom';

/**
 * Recursively strips undefined values, functions, and symbols to ensure strict Firestore compatibility.
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
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

export interface SyncedFinancialFields {
  subcontractorCost?: number;
  customerBilled?: number;
  netProfit?: number;
  profitMarginPercent?: number;
  paymentStatus?: string;
  paidAmount?: number;
  remainingAmount?: number;
  orderId?: string;
  orderNumber?: string;
  invoiceNumber?: string;
}

/**
 * Searches across maintenanceLogs, invoices, and transactions to find any existing
 * non-zero subcontractorCost or profit fields for a given job/order/invoice identifier.
 * Prevents defaulting to 0 when data exists in another linked document.
 */
export async function fetchUnifiedProfitAndCosts(identifiers: {
  id?: string;
  referenceId?: string;
  orderNumber?: string;
  orderId?: string;
  invoiceNumber?: string;
}): Promise<SyncedFinancialFields | null> {
  const { id, referenceId, orderNumber, orderId, invoiceNumber } = identifiers;

  const validOrderNum = orderNumber || orderId;
  const validInvNum = invoiceNumber;

  // 1. Check maintenanceLogs directly if id is provided
  if (id) {
    try {
      const logSnap = await getDoc(doc(db, 'maintenanceLogs', id));
      if (logSnap.exists()) {
        const d = logSnap.data();
        if (d.subcontractorCost !== undefined && Number(d.subcontractorCost) > 0) {
          const billed = Number(d.customerBilled ?? d.cost ?? 0);
          const sub = Number(d.subcontractorCost);
          const metrics = calculateProfitMetrics(billed, sub);
          return {
            subcontractorCost: metrics.subcontractorCost,
            customerBilled: metrics.customerBilled,
            netProfit: metrics.netProfit,
            profitMarginPercent: metrics.profitMarginPercent,
            orderNumber: d.orderNumber || d.orderId,
            orderId: d.orderId || d.orderNumber,
            invoiceNumber: d.invoiceNumber,
            paymentStatus: d.paymentStatus,
          };
        }
      }
    } catch (e) {
      console.warn('Error reading maintenance log:', e);
    }
  }

  // 2. Check invoices directly if id or referenceId is provided
  const invoiceDocId = id || referenceId;
  if (invoiceDocId) {
    try {
      const invSnap = await getDoc(doc(db, 'invoices', invoiceDocId));
      if (invSnap.exists()) {
        const d = invSnap.data();
        let sub = Number(d.subcontractorCost || 0);
        if (sub <= 0 && Array.isArray(d.lineItems)) {
          sub = d.lineItems.reduce((acc: number, li: any) => acc + (Number(li.subcontractorCost) || 0), 0);
        }
        if (sub > 0) {
          const billed = Number(d.customerBilled ?? d.total ?? d.amount ?? 0);
          const metrics = calculateProfitMetrics(billed, sub);
          return {
            subcontractorCost: metrics.subcontractorCost,
            customerBilled: metrics.customerBilled,
            netProfit: metrics.netProfit,
            profitMarginPercent: metrics.profitMarginPercent,
            orderNumber: d.orderNumber || d.orderId,
            orderId: d.orderId || d.orderNumber,
            invoiceNumber: d.invoiceNumber,
            paymentStatus: d.paymentStatus,
          };
        }
      }
    } catch (e) {
      console.warn('Error reading invoice doc:', e);
    }
  }

  // 3. Check transactions by referenceId
  if (id || referenceId) {
    const targetRef = id || referenceId;
    try {
      const txQuery = query(
        collection(db, 'transactions'),
        where('referenceId', '==', targetRef)
      );
      const txSnap = await getDocs(txQuery);
      for (const d of txSnap.docs) {
        const data = d.data();
        if (data.subcontractorCost !== undefined && Number(data.subcontractorCost) > 0) {
          const billed = Number(data.customerBilled ?? data.amount ?? 0);
          const sub = Number(data.subcontractorCost);
          const metrics = calculateProfitMetrics(billed, sub);
          return {
            subcontractorCost: metrics.subcontractorCost,
            customerBilled: metrics.customerBilled,
            netProfit: metrics.netProfit,
            profitMarginPercent: metrics.profitMarginPercent,
            orderId: data.orderId || data.orderNumber,
            invoiceNumber: data.invoiceNumber || data.paymentReference,
            paymentStatus: data.paymentStatus,
          };
        }
      }
    } catch (e) {
      console.warn('Error reading transactions by referenceId:', e);
    }
  }

  // 4. Check by invoiceNumber across invoices and transactions
  if (validInvNum && validInvNum.trim()) {
    const cleanInv = validInvNum.trim();
    try {
      const invQuery = query(collection(db, 'invoices'), where('invoiceNumber', '==', cleanInv));
      const invSnap = await getDocs(invQuery);
      for (const d of invSnap.docs) {
        const data = d.data();
        let sub = Number(data.subcontractorCost || 0);
        if (sub <= 0 && Array.isArray(data.lineItems)) {
          sub = data.lineItems.reduce((acc: number, li: any) => acc + (Number(li.subcontractorCost) || 0), 0);
        }
        if (sub > 0) {
          const billed = Number(data.customerBilled ?? data.total ?? data.amount ?? 0);
          const metrics = calculateProfitMetrics(billed, sub);
          return {
            subcontractorCost: metrics.subcontractorCost,
            customerBilled: metrics.customerBilled,
            netProfit: metrics.netProfit,
            profitMarginPercent: metrics.profitMarginPercent,
            orderNumber: data.orderNumber || data.orderId,
            orderId: data.orderId || data.orderNumber,
            invoiceNumber: data.invoiceNumber,
            paymentStatus: data.paymentStatus,
          };
        }
      }

      // Check transactions by paymentReference or invoiceNumber
      const txQuery = query(
        collection(db, 'transactions'),
        where('paymentReference', '==', cleanInv)
      );
      const txSnap = await getDocs(txQuery);
      for (const d of txSnap.docs) {
        const data = d.data();
        if (data.subcontractorCost !== undefined && Number(data.subcontractorCost) > 0) {
          const billed = Number(data.customerBilled ?? data.amount ?? 0);
          const sub = Number(data.subcontractorCost);
          const metrics = calculateProfitMetrics(billed, sub);
          return {
            subcontractorCost: metrics.subcontractorCost,
            customerBilled: metrics.customerBilled,
            netProfit: metrics.netProfit,
            profitMarginPercent: metrics.profitMarginPercent,
            orderId: data.orderId || data.orderNumber,
            invoiceNumber: data.invoiceNumber || data.paymentReference,
            paymentStatus: data.paymentStatus,
          };
        }
      }
    } catch (e) {
      console.warn('Error reading by invoiceNumber:', e);
    }
  }

  // 5. Check by orderNumber across maintenanceLogs and invoices
  if (validOrderNum && validOrderNum.trim()) {
    const cleanOrd = validOrderNum.trim();
    try {
      const mlQuery = query(
        collection(db, 'maintenanceLogs'),
        where('orderNumber', '==', cleanOrd)
      );
      const mlSnap = await getDocs(mlQuery);
      for (const d of mlSnap.docs) {
        const data = d.data();
        if (data.subcontractorCost !== undefined && Number(data.subcontractorCost) > 0) {
          const billed = Number(data.customerBilled ?? data.cost ?? 0);
          const sub = Number(data.subcontractorCost);
          const metrics = calculateProfitMetrics(billed, sub);
          return {
            subcontractorCost: metrics.subcontractorCost,
            customerBilled: metrics.customerBilled,
            netProfit: metrics.netProfit,
            profitMarginPercent: metrics.profitMarginPercent,
            orderNumber: data.orderNumber || data.orderId,
            orderId: data.orderId || data.orderNumber,
            invoiceNumber: data.invoiceNumber,
            paymentStatus: data.paymentStatus,
          };
        }
      }
    } catch (e) {
      console.warn('Error reading by orderNumber:', e);
    }
  }

  return null;
}

/**
 * 2-WAY SYNC FOR MAINTENANCE PAGE:
 * Updates a maintenanceLog and propagates cost, subcontractorCost, customerBilled, profit,
 * paymentStatus, orderId, and invoiceNumber to linked Invoices and Transactions in Firestore.
 */
export async function syncMaintenanceRecord(
  logId: string,
  updates: Record<string, any>
): Promise<void> {
  if (!logId) return;

  const logRef = doc(db, 'maintenanceLogs', logId);
  const logSnap = await getDoc(logRef);
  const existingLog = logSnap.exists() ? logSnap.data() : {};

  const orderNum = updates.orderNumber || updates.orderId || existingLog.orderNumber || existingLog.orderId;
  const invNum = updates.invoiceNumber || existingLog.invoiceNumber;
  const billedAmount =
    updates.customerBilled !== undefined
      ? Number(updates.customerBilled)
      : updates.cost !== undefined
      ? Number(updates.cost)
      : Number(existingLog.customerBilled ?? existingLog.cost ?? 0);

  const subCost =
    updates.subcontractorCost !== undefined
      ? Number(updates.subcontractorCost)
      : Number(existingLog.subcontractorCost ?? 0);

  const metrics = calculateProfitMetrics(billedAmount, subCost);

  // 1. Prepare updates for the maintenanceLog itself
  const logPayload: Record<string, any> = {
    ...updates,
    subcontractorCost: metrics.subcontractorCost,
    dealerCost: metrics.subcontractorCost,
    customerBilled: metrics.customerBilled,
    netProfit: metrics.netProfit,
    profitMarginPercent: metrics.profitMarginPercent,
    isProfitEdited: true,
    isEdited: true,
    updatedAt: new Date(),
  };
  if (orderNum) {
    logPayload.orderNumber = orderNum;
    logPayload.orderId = orderNum;
  }
  if (invNum) {
    logPayload.invoiceNumber = invNum;
  }

  // Use a single Firestore writeBatch for atomic and rapid execution
  const syncBatch = writeBatch(db);
  syncBatch.update(logRef, sanitizeForFirestore(logPayload));

  // 2. Find and update linked invoices in Firestore
  const invoicesToUpdate = new Map<string, any>();
  try {
    // By referenceId
    const qInvByRef = query(collection(db, 'invoices'), where('referenceId', '==', logId));
    const snapInvByRef = await getDocs(qInvByRef);
    snapInvByRef.docs.forEach((d) => invoicesToUpdate.set(d.id, d.data()));

    // By invoiceNumber
    if (invNum && invNum.trim()) {
      const qInvByNum = query(
        collection(db, 'invoices'),
        where('invoiceNumber', '==', invNum.trim())
      );
      const snapInvByNum = await getDocs(qInvByNum);
      snapInvByNum.docs.forEach((d) => invoicesToUpdate.set(d.id, d.data()));
    }

    // By orderNumber / orderId
    if (orderNum && orderNum.trim()) {
      const qInvByOrd = query(
        collection(db, 'invoices'),
        where('orderNumber', '==', orderNum.trim())
      );
      const snapInvByOrd = await getDocs(qInvByOrd);
      snapInvByOrd.docs.forEach((d) => invoicesToUpdate.set(d.id, d.data()));
    }

    for (const [invId, invData] of invoicesToUpdate.entries()) {
      const invPayload: Record<string, any> = {
        subcontractorCost: metrics.subcontractorCost,
        dealerCost: metrics.subcontractorCost,
        customerBilled: metrics.customerBilled,
        netProfit: metrics.netProfit,
        profitMarginPercent: metrics.profitMarginPercent,
        isProfitEdited: true,
        isEdited: true,
        updatedAt: new Date(),
      };
      if (updates.paymentStatus) invPayload.paymentStatus = updates.paymentStatus;
      if (orderNum) {
        invPayload.orderNumber = orderNum;
        invPayload.orderId = orderNum;
      }
      if (invNum) invPayload.invoiceNumber = invNum;

      // Update line items subcontractor cost proportionally or if single item
      if (Array.isArray(invData.lineItems) && invData.lineItems.length > 0) {
        invPayload.lineItems = invData.lineItems.map((li: any) => ({
          ...li,
          subcontractorCost: metrics.subcontractorCost,
          dealerCost: metrics.subcontractorCost,
          customerBilled: metrics.customerBilled,
          netProfit: metrics.netProfit,
          profitMarginPercent: metrics.profitMarginPercent,
        }));
      }

      syncBatch.update(doc(db, 'invoices', invId), sanitizeForFirestore(invPayload));
    }
  } catch (err) {
    console.warn('Error syncing linked invoices from maintenance:', err);
  }

  // 3. Find and update linked transactions in Firestore
  try {
    const txToUpdate = new Map<string, any>();

    // By referenceId matching logId
    const qTxByRef = query(collection(db, 'transactions'), where('referenceId', '==', logId));
    const snapTxByRef = await getDocs(qTxByRef);
    snapTxByRef.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

    // By linkedInvoiceRef matching logId
    const qTxByLinkedRef = query(collection(db, 'transactions'), where('linkedInvoiceRef', '==', logId));
    const snapTxByLinkedRef = await getDocs(qTxByLinkedRef);
    snapTxByLinkedRef.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

    // By orderId / orderNumber variants (handles "Order #A1", "#A1", "A1", etc.)
    if (orderNum && String(orderNum).trim()) {
      const variants = getOrderCandidateVariants(String(orderNum).trim());
      for (const variant of variants) {
        try {
          const qTxByOrd = query(collection(db, 'transactions'), where('orderId', '==', variant));
          const snapTxByOrd = await getDocs(qTxByOrd);
          snapTxByOrd.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

          const qTxByOrdNum = query(collection(db, 'transactions'), where('orderNumber', '==', variant));
          const snapTxByOrdNum = await getDocs(qTxByOrdNum);
          snapTxByOrdNum.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

          const qTxByRefVar = query(collection(db, 'transactions'), where('referenceId', '==', variant));
          const snapTxByRefVar = await getDocs(qTxByRefVar);
          snapTxByRefVar.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

          const qTxByLinkedVar = query(collection(db, 'transactions'), where('linkedInvoiceRef', '==', variant));
          const snapTxByLinkedVar = await getDocs(qTxByLinkedVar);
          snapTxByLinkedVar.docs.forEach((d) => txToUpdate.set(d.id, d.data()));
        } catch {
          // Continue scanning variants
        }
      }
    }

    // Additional scan if no direct matches yet: check recent transactions matching isMaintenanceOrderMatch
    if (txToUpdate.size === 0) {
      try {
        const allTxSnap = await getDocs(query(collection(db, 'transactions')));
        const dummyLog = {
          id: logId,
          orderNumber: orderNum,
          orderId: orderNum,
          invoiceNumber: invNum,
          cost: billedAmount,
          customerBilled: billedAmount,
        };
        allTxSnap.docs.forEach((d) => {
          const tData = d.data();
          if (isMaintenanceOrderMatch(tData, dummyLog)) {
            txToUpdate.set(d.id, tData);
          }
        });
      } catch {
        // Fallback scan safe
      }
    }

    // By invoiceNumber / paymentReference
    if (invNum && invNum.trim()) {
      const cleanInv = invNum.trim();
      const qTxByInv = query(collection(db, 'transactions'), where('invoiceNumber', '==', cleanInv));
      const snapTxByInv = await getDocs(qTxByInv);
      snapTxByInv.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

      const qTxByPayRef = query(collection(db, 'transactions'), where('paymentReference', '==', cleanInv));
      const snapTxByPayRef = await getDocs(qTxByPayRef);
      snapTxByPayRef.docs.forEach((d) => txToUpdate.set(d.id, d.data()));
    }

    // Transactions referencing linked invoices
    for (const [invId, invData] of invoicesToUpdate.entries()) {
      const qTxByInvId = query(collection(db, 'transactions'), where('referenceId', '==', invId));
      const snapTxByInvId = await getDocs(qTxByInvId);
      snapTxByInvId.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

      if (invData?.invoiceNumber) {
        const qTxByInvNum = query(collection(db, 'transactions'), where('invoiceNumber', '==', invData.invoiceNumber));
        const snapTxByInvNum = await getDocs(qTxByInvNum);
        snapTxByInvNum.docs.forEach((d) => txToUpdate.set(d.id, d.data()));
      }
    }

    const hasSubCost = metrics.subcontractorCost > 0;
    const isPassThrough = hasSubCost && Math.abs(metrics.customerBilled - metrics.subcontractorCost) < 0.01;
    const isMarkUp = hasSubCost && metrics.customerBilled > metrics.subcontractorCost + 0.01;
    const isPureExpense = metrics.customerBilled <= 0.01 && hasSubCost;
    const isDirectTransaction = !hasSubCost;

    const unifiedTxPayload: Record<string, any> = {
      type: isPureExpense ? 'expense' : 'income',
      transactionType: isPureExpense ? 'EXPENSE' : 'INCOME',
      entryType: isPureExpense ? 'DEBIT' : 'CREDIT',
      category: isPassThrough ? 'Pass-Through Maintenance' : (updates.type || existingLog.type || 'Maintenance'),
      amount: isPureExpense ? metrics.subcontractorCost : metrics.customerBilled,
      customerBilled: metrics.customerBilled,
      grossBilling: metrics.customerBilled,
      dealerCost: hasSubCost ? metrics.subcontractorCost : 0,
      subcontractorCost: hasSubCost ? metrics.subcontractorCost : 0,
      netProfit: isPassThrough || isDirectTransaction ? 0 : metrics.netProfit,
      profitMargin: isPassThrough || isDirectTransaction ? 0 : metrics.profitMargin,
      profitMarginPercent: isPassThrough || isDirectTransaction ? 0 : metrics.profitMarginPercent,
      isPassThrough: isPassThrough,
      passThrough: isPassThrough,
      isPassThroughMaintenance: isPassThrough,
      isDirectTransaction: isDirectTransaction,
      hasSubcontractorCost: hasSubCost,
      isProfitEdited: hasSubCost,
      isEdited: hasSubCost,
      entityType: 'MAINTENANCE',
      referenceId: logId,
      sourceReferenceId: logId,
      linkedInvoiceRef: logId,
      updatedAt: new Date(),
    };
    if (isPassThrough) {
      unifiedTxPayload.customCategory = 'Pass-Through Maintenance';
    }
    if (updates.paymentStatus || existingLog.paymentStatus) {
      unifiedTxPayload.paymentStatus = updates.paymentStatus || existingLog.paymentStatus;
    }
    if (updates.paidAmount !== undefined || existingLog.paidAmount !== undefined) {
      const pAmt = Number(updates.paidAmount !== undefined ? updates.paidAmount : existingLog.paidAmount);
      unifiedTxPayload.paidAmount = pAmt;
      unifiedTxPayload.paid = pAmt;
    }
    if (updates.remainingAmount !== undefined || existingLog.remainingAmount !== undefined) {
      const rAmt = Number(updates.remainingAmount !== undefined ? updates.remainingAmount : existingLog.remainingAmount);
      unifiedTxPayload.remainingAmount = rAmt;
      unifiedTxPayload.owing = rAmt;
    }
    if (orderNum) {
      unifiedTxPayload.orderId = orderNum;
      unifiedTxPayload.orderNumber = orderNum;
    }
    if (invNum) {
      unifiedTxPayload.invoiceNumber = invNum;
    }

    if (txToUpdate.size > 0) {
      // Single-record enforcement: Select ONE primary record to update, and delete any duplicate records
      const [primaryTxId] = txToUpdate.keys();
      syncBatch.update(doc(db, 'transactions', primaryTxId), sanitizeForFirestore(unifiedTxPayload));
      syncBatch.set(doc(db, 'finance_ledger', primaryTxId), sanitizeForFirestore({ id: primaryTxId, ...unifiedTxPayload }), { merge: true });

      // Delete any additional duplicate entries
      for (const txId of txToUpdate.keys()) {
        if (txId !== primaryTxId) {
          console.log(`[FinanceLedger Audit] Purging duplicate entry ${txId} during single-record maintenance sync`);
          syncBatch.delete(doc(db, 'transactions', txId));
          syncBatch.delete(doc(db, 'finance_ledger', txId));
        }
      }
    } else {
      // Insert single unified Financial Ledger Record
      const newTxRef = doc(collection(db, 'transactions'));
      const newTx = {
        id: newTxRef.id,
        ...unifiedTxPayload,
        description: updates.description || existingLog.description || `Maintenance Job: ${updates.type || existingLog.type || 'Service'} | Order: ${orderNum || logId}`,
        date: updates.date ? new Date(updates.date) : (existingLog.date ? new Date(existingLog.date) : new Date()),
        createdAt: new Date(),
        createdBy: updates.updatedBy || existingLog.createdBy || 'system',
        status: 'completed',
        vehicleId: updates.vehicleId || existingLog.vehicleId || null,
        vehicleName: updates.vehicleName || existingLog.vehicleName || null,
        customerId: updates.customerId || existingLog.customerId || null,
        customerName: updates.customerName || existingLog.customerName || existingLog.serviceProvider || null,
      };
      syncBatch.set(newTxRef, sanitizeForFirestore(newTx));
      syncBatch.set(doc(db, 'finance_ledger', newTxRef.id), sanitizeForFirestore(newTx), { merge: true });
    }

    // Commit all updates (log, invoices, transactions) atomically in a single roundtrip
    await syncBatch.commit();

    // Always run orphan purge for this maintenance order / Order #A1
    await purgeOrphanedMaintenanceIncomeEntries(orderNum || logId || 'A1');
  } catch (err) {
    console.warn('Error syncing linked transactions from maintenance:', err);
  }

  // 4. Emit real-time synchronization event & notify backend
  try {
    const eventDetail = {
      logId,
      orderId: orderNum,
      orderNumber: orderNum,
      invoiceNumber: invNum,
      dealerCost: metrics.subcontractorCost,
      subcontractorCost: metrics.subcontractorCost,
      customerBilled: metrics.customerBilled,
      netProfit: metrics.netProfit,
      profitMarginPercent: metrics.profitMarginPercent,
      isProfitEdited: true,
      isEdited: true,
      timestamp: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('maintenanceRecordUpdated', { detail: eventDetail })
      );
      window.dispatchEvent(
        new CustomEvent('maintenanceCostUpdated', { detail: eventDetail })
      );
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', { detail: eventDetail })
      );
    }
    fetch('/api/maintenance/sync-dealer-cost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventDetail),
    }).catch(() => { /* non-blocking */ });
  } catch {
    // Non-blocking
  }
}

/**
 * 2-WAY SYNC FOR RENTAL PAGE:
 * Updates a rental and propagates customerBilled, dealerCost, subcontractorCost, netProfit,
 * vatAmount, paymentStatus, completionStatus, and dates to the Finance Ledger.
 * Also handles damage charges and rental extensions.
 */
export async function syncRentalRecord(
  rentalId: string,
  updates: Record<string, any>
): Promise<void> {
  if (!rentalId) return;

  const rentalRef = doc(db, 'rentals', rentalId);
  const rentalSnap = await getDoc(rentalRef);
  const existingRental = rentalSnap.exists() ? rentalSnap.data() : {};

  const agreementNum = updates.rentalAgreementNumber || existingRental.rentalAgreementNumber;
  const billedAmount =
    updates.customerBilled !== undefined
      ? Number(updates.customerBilled)
      : updates.cost !== undefined
      ? Number(updates.cost)
      : Number(existingRental.customerBilled ?? existingRental.cost ?? 0);

  const subCost =
    updates.dealerCost !== undefined
      ? Number(updates.dealerCost)
      : updates.subcontractorCost !== undefined
      ? Number(updates.subcontractorCost)
      : Number(existingRental.dealerCost ?? existingRental.subcontractorCost ?? 0);

  const vat =
    updates.vatAmount !== undefined
      ? Number(updates.vatAmount)
      : Number(existingRental.vatAmount ?? (existingRental.includeVAT ? billedAmount * (0.2 / 1.2) : 0));

  const isExplicitlyEdited =
    updates.isEdited === true ||
    existingRental.isEdited === true ||
    (subCost > 0 && subCost !== billedAmount);

  const metrics = calculateProfitMetrics(billedAmount, subCost, vat);

  const rawPaymentStatus = updates.paymentStatus || existingRental.paymentStatus || 'unpaid';
  const normPaymentStatus = normalizePaymentStatus(rawPaymentStatus);

  const rawStatus = updates.status || existingRental.status || 'scheduled';
  const normCompletionStatus = normalizeCompletionStatus(rawStatus);

  // 1. Update rental itself with unified schema
  const rentalPayload: Record<string, any> = {
    ...updates,
    entityId: rentalId,
    entityType: 'RENTAL',
    customerBilled: billedAmount,
    cost: billedAmount,
    dealerCost: subCost,
    subcontractorCost: subCost,
    netProfit: isExplicitlyEdited ? metrics.netProfit : 0,
    profitMargin: isExplicitlyEdited ? metrics.profitMargin : 0,
    profitMarginPercent: isExplicitlyEdited ? metrics.profitMarginPercent : 0,
    isEdited: isExplicitlyEdited,
    vatAmount: vat,
    vatType: updates.vatType || (vat > 0 ? 'standard_20' : 'exempt'),
    paymentStatus: rawPaymentStatus,
    completionStatus: normCompletionStatus,
    updatedAt: new Date(),
  };

  await updateDoc(rentalRef, sanitizeForFirestore(rentalPayload));

  // 2. Find and update linked Finance Ledger transactions
  try {
    const txToUpdate = new Map<string, any>();

    const q1 = query(collection(db, 'transactions'), where('referenceId', '==', rentalId));
    const s1 = await getDocs(q1);
    s1.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

    const q2 = query(collection(db, 'transactions'), where('entityId', '==', rentalId));
    const s2 = await getDocs(q2);
    s2.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

    if (agreementNum) {
      const q3 = query(collection(db, 'transactions'), where('orderNumber', '==', agreementNum));
      const s3 = await getDocs(q3);
      s3.docs.forEach((d) => txToUpdate.set(d.id, d.data()));
    }

    const txPayload: Record<string, any> = {
      entityId: rentalId,
      entityType: 'RENTAL',
      referenceId: rentalId,
      linkedInvoiceRef: rentalId,
      orderNumber: agreementNum || null,
      type: 'income',
      category: 'Vehicle Rental Income',
      amount: billedAmount,
      customerBilled: billedAmount,
      departmentName: 'Vehicle Rental / Fleet',
      dealerCost: subCost,
      subcontractorCost: subCost,
      netProfit: isExplicitlyEdited ? metrics.netProfit : 0,
      profitMargin: isExplicitlyEdited ? metrics.profitMargin : 0,
      profitMarginPercent: isExplicitlyEdited ? metrics.profitMarginPercent : 0,
      isProfitEdited: isExplicitlyEdited,
      isEdited: isExplicitlyEdited,
      vatAmount: vat,
      vatType: rentalPayload.vatType,
      paymentStatus: rawPaymentStatus,
      completionStatus: normCompletionStatus,
      updatedAt: new Date(),
    };

    if (updates.startDate || existingRental.startDate) {
      txPayload.date = new Date(updates.startDate || existingRental.startDate);
    }

    if (txToUpdate.size > 0) {
      for (const [txId, existingTxData] of txToUpdate.entries()) {
        const isIndividualPayment = Boolean(
          existingTxData?.paymentId ||
          existingTxData?.category === 'Vehicle Rental Income' ||
          existingTxData?.isPayment ||
          existingTxData?.isRentalPayment
        );

        if (isIndividualPayment) {
          // Do NOT overwrite individual payment amount with the full rental cost!
          // Propagate payment status and completion updates directly to the linked ledger entry
          const paymentTxPayload = {
            paymentStatus: rawPaymentStatus,
            category: 'Vehicle Rental Income',
            departmentName: 'Vehicle Rental / Fleet',
            ...(normCompletionStatus === 'cancelled' ? { status: 'cancelled' } : {}),
            orderNumber: agreementNum || existingTxData.orderNumber || null,
            updatedAt: new Date(),
          };
          await updateDoc(doc(db, 'transactions', txId), sanitizeForFirestore(paymentTxPayload)).catch(() => {});
          await updateDoc(doc(db, 'finance_ledger', txId), sanitizeForFirestore(paymentTxPayload)).catch(() => {});
        } else {
          await updateDoc(doc(db, 'transactions', txId), sanitizeForFirestore(txPayload)).catch(() => {});
          await updateDoc(doc(db, 'finance_ledger', txId), sanitizeForFirestore(txPayload)).catch(() => {});
        }
      }
    } else {
      // Create new transaction in Finance Ledger
      const newTx: Record<string, any> = {
        ...txPayload,
        description: `Rental: ${existingRental.type || 'Standard'} | Agreement: ${agreementNum || rentalId.slice(0, 8)}`,
        vehicleId: updates.vehicleId || existingRental.vehicleId || null,
        customerId: updates.customerId || existingRental.customerId || null,
        date: txPayload.date || new Date(),
        createdAt: new Date(),
        createdBy: updates.updatedBy || existingRental.createdBy || 'system',
      };
      const createdTxRef = await addDoc(collection(db, 'transactions'), sanitizeForFirestore(newTx));
      await setDoc(doc(db, 'finance_ledger', createdTxRef.id), sanitizeForFirestore({ id: createdTxRef.id, ...newTx }), { merge: true }).catch(() => {});
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            entityId: rentalId,
            referenceId: rentalId,
            paymentStatus: rawPaymentStatus,
            action: 'SYNC_RENTAL',
            timestamp: Date.now(),
          },
        })
      );
    }

    // Return condition / vehicle damage charges
    const returnCond = updates.returnCondition || existingRental.returnCondition;
    if (returnCond && (Number(returnCond.damageCost) > 0 || Number(returnCond.totalCharges) > 0)) {
      const damageAmount = Number(returnCond.damageCost || returnCond.totalCharges || 0);
      const qDmg = query(
        collection(db, 'transactions'),
        where('referenceId', '==', `${rentalId}_damage`)
      );
      const sDmg = await getDocs(qDmg);
      const dmgPayload: Record<string, any> = {
        entityId: rentalId,
        entityType: 'RENTAL',
        referenceId: `${rentalId}_damage`,
        linkedInvoiceRef: rentalId,
        orderNumber: agreementNum || null,
        type: 'income',
        category: 'vehicle-damage',
        amount: damageAmount,
        customerBilled: damageAmount,
        dealerCost: 0,
        subcontractorCost: 0,
        netProfit: damageAmount,
        profitMargin: 100,
        profitMarginPercent: 100,
        description: `Damage/Return charges for rental ${agreementNum || rentalId.slice(0, 8)}: ${returnCond.damageDescription || 'Vehicle return condition'}`,
        vehicleId: updates.vehicleId || existingRental.vehicleId || null,
        customerId: updates.customerId || existingRental.customerId || null,
        paymentStatus: updates.paymentStatus || existingRental.paymentStatus || 'unpaid',
        completionStatus: 'COMPLETED',
        updatedAt: new Date(),
      };
      if (!sDmg.empty) {
        await updateDoc(doc(db, 'transactions', sDmg.docs[0].id), sanitizeForFirestore(dmgPayload));
      } else {
        await addDoc(collection(db, 'transactions'), sanitizeForFirestore({
          ...dmgPayload,
          date: new Date(),
          createdAt: new Date(),
          createdBy: updates.updatedBy || 'system',
        }));
      }
    }
  } catch (err) {
    console.warn('Error syncing linked transactions from rental:', err);
  }

  // Real-time events & backend notification
  try {
    const eventDetail = {
      entityId: rentalId,
      entityType: 'RENTAL',
      orderNumber: agreementNum,
      customerBilled: billedAmount,
      dealerCost: subCost,
      subcontractorCost: subCost,
      netProfit: isExplicitlyEdited ? metrics.netProfit : 0,
      profitMargin: isExplicitlyEdited ? metrics.profitMargin : 0,
      paymentStatus: normPaymentStatus,
      completionStatus: normCompletionStatus,
      timestamp: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rentalRecordUpdated', { detail: eventDetail }));
      window.dispatchEvent(new CustomEvent('financeRecordUpdated', { detail: eventDetail }));
    }
    fetch('/api/finance/sync-adjustment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventDetail),
    }).catch(() => {});
  } catch {}
}

/**
 * 2-WAY SYNC FOR INVOICE PAGE:
 * Updates an invoice and propagates cost, subcontractorCost, customerBilled, profit,
 * paymentStatus, orderId, and invoiceNumber to linked MaintenanceLogs and Transactions in Firestore.
 */
export async function syncInvoiceRecord(
  invoiceId: string,
  updates: Record<string, any>
): Promise<void> {
  if (!invoiceId) return;

  const invRef = doc(db, 'invoices', invoiceId);
  const invSnap = await getDoc(invRef);
  const existingInv = invSnap.exists() ? invSnap.data() : {};

  const orderNum =
    updates.orderNumber ||
    updates.orderId ||
    existingInv.orderNumber ||
    existingInv.orderId;
  const invNum = updates.invoiceNumber || existingInv.invoiceNumber;
  const refId = updates.referenceId || existingInv.referenceId;

  const billedAmount =
    updates.customerBilled !== undefined
      ? Number(updates.customerBilled)
      : updates.total !== undefined
      ? Number(updates.total)
      : updates.amount !== undefined
      ? Number(updates.amount)
      : Number(existingInv.customerBilled ?? existingInv.total ?? existingInv.amount ?? 0);

  const subCost =
    updates.subcontractorCost !== undefined
      ? Number(updates.subcontractorCost)
      : Number(existingInv.subcontractorCost ?? 0);

  const metrics = calculateProfitMetrics(billedAmount, subCost);

  // 1. Update invoice itself
  const invPayload: Record<string, any> = {
    ...updates,
    subcontractorCost: metrics.subcontractorCost,
    customerBilled: metrics.customerBilled,
    netProfit: metrics.netProfit,
    profitMarginPercent: metrics.profitMarginPercent,
    updatedAt: new Date(),
  };
  if (orderNum) {
    invPayload.orderNumber = orderNum;
    invPayload.orderId = orderNum;
  }
  if (invNum) {
    invPayload.invoiceNumber = invNum;
  }

  // Atomic batch write for invoice and all linked transactions
  const syncBatch = writeBatch(db);
  syncBatch.update(invRef, sanitizeForFirestore(invPayload));

  // 2. DIRECTIONAL EDITING HIERARCHY RULE:
  // EDITED ON INVOICE PAGE (Mid-Level Source):
  // Updating details on the Invoice page MUST ONLY update the Finance Page.
  // It must NOT alter the original Maintenance record.

  // 3. Find and update linked transactions in Firestore (Finance Page)
  try {
    const isMaintenanceLinked = Boolean(
      updates.skipLedgerIncome ||
      existingInv.skipLedgerIncome ||
      updates.preventFinanceSync ||
      existingInv.preventFinanceSync ||
      updates.maintenanceJobId ||
      existingInv.maintenanceJobId ||
      updates.maintenanceOrderId ||
      existingInv.maintenanceOrderId ||
      updates.entityType === 'MAINTENANCE' ||
      existingInv.entityType === 'MAINTENANCE' ||
      (updates.category && String(updates.category).toLowerCase() === 'maintenance') ||
      (existingInv.category && String(existingInv.category).toLowerCase() === 'maintenance') ||
      (orderNum && (normalizeOrderRef(orderNum) !== '' || String(orderNum).toUpperCase().startsWith('A') || String(orderNum).toLowerCase().includes('order'))) ||
      (refId && (String(existingInv.orderNumber || updates.orderNumber || '').trim() !== '')) ||
      (String(updates.description || existingInv.description || '').toLowerCase().includes('maintenance'))
    );

    // 3. PREVENT DUPLICATE INVOICING LEDGER ENTRIES:
    // When an Invoice is generated for an existing Maintenance record, update the existing Maintenance ledger entry's payment status rather than creating a second duplicate invoice transaction in the Finance module.
    if (isMaintenanceLinked || updates.skipLedgerIncome || existingInv.skipLedgerIncome) {
      console.log(
        `[FinanceLedger Audit] [syncFinancialRecord:INVOICE] Syncing invoice payment status to existing Maintenance ledger entry for ${invoiceId} (Order #${orderNum || 'N/A'}).`
      );

      const candidateVariants = orderNum ? getOrderCandidateVariants(String(orderNum).trim()) : [];
      const mLogId = refId || updates.maintenanceJobId || existingInv.maintenanceJobId;
      if (mLogId) candidateVariants.push(mLogId);

      let maintenanceTxDocId: string | null = null;
      for (const variant of candidateVariants) {
        try {
          const qByOrd = query(collection(db, 'transactions'), where('orderId', '==', variant));
          const snapByOrd = await getDocs(qByOrd);
          if (!snapByOrd.empty) {
            maintenanceTxDocId = snapByOrd.docs[0].id;
            break;
          }
          const qByRef = query(collection(db, 'transactions'), where('referenceId', '==', variant));
          const snapByRef = await getDocs(qByRef);
          if (!snapByRef.empty) {
            maintenanceTxDocId = snapByRef.docs[0].id;
            break;
          }
          const qBySrc = query(collection(db, 'transactions'), where('sourceReferenceId', '==', variant));
          const snapBySrc = await getDocs(qBySrc);
          if (!snapBySrc.empty) {
            maintenanceTxDocId = snapBySrc.docs[0].id;
            break;
          }
        } catch {}
      }

      const resolvedInvNum = invNum || existingInv.invoiceNumber || updates.invoiceNumber;
      const targetPaymentStatus = updates.paymentStatus || existingInv.paymentStatus || 'unpaid';
      const targetPaid = updates.paidAmount !== undefined ? Number(updates.paidAmount) : (existingInv.paidAmount !== undefined ? Number(existingInv.paidAmount) : undefined);
      const targetRemaining = updates.remainingAmount !== undefined ? Number(updates.remainingAmount) : (existingInv.remainingAmount !== undefined ? Number(existingInv.remainingAmount) : undefined);

      if (maintenanceTxDocId) {
        const updatePayload: Record<string, any> = {
          paymentStatus: targetPaymentStatus,
          status: targetPaymentStatus === 'paid' ? 'completed' : targetPaymentStatus,
          ...(targetPaid !== undefined && { paidAmount: targetPaid, paid: targetPaid }),
          ...(targetRemaining !== undefined && { remainingAmount: targetRemaining, owing: targetRemaining }),
          ...(resolvedInvNum && { invoiceNumber: resolvedInvNum }),
          invoiceId: invoiceId,
          linkedInvoiceRef: invoiceId,
          updatedAt: new Date(),
        };
        if (updates.paymentMethod || existingInv.paymentMethod) {
          updatePayload.paymentMethod = updates.paymentMethod || existingInv.paymentMethod;
        }
        if (updates.paymentReference || existingInv.paymentReference) {
          updatePayload.paymentReference = updates.paymentReference || existingInv.paymentReference;
        }
        syncBatch.update(doc(db, 'transactions', maintenanceTxDocId), sanitizeForFirestore(updatePayload));
        syncBatch.set(doc(db, 'finance_ledger', maintenanceTxDocId), sanitizeForFirestore({ id: maintenanceTxDocId, ...updatePayload }), { merge: true });
      }

      // Purge any separate duplicate invoice transactions created for this maintenance invoice
      try {
        const dupQueries = [
          query(collection(db, 'transactions'), where('invoiceId', '==', invoiceId)),
          query(collection(db, 'transactions'), where('referenceId', '==', invoiceId)),
        ];
        for (const q of dupQueries) {
          const snap = await getDocs(q);
          snap.docs.forEach((d) => {
            if (d.id !== maintenanceTxDocId) {
              console.log(`[FinanceLedger Audit] Purging duplicate invoice transaction ${d.id} for maintenance invoice ${invoiceId}`);
              syncBatch.delete(doc(db, 'transactions', d.id));
              syncBatch.delete(doc(db, 'finance_ledger', d.id));
            }
          });
        }
      } catch {}

      await syncBatch.commit();
      invalidateFinanceLedgerCache();
      await purgeOrphanedMaintenanceIncomeEntries(orderNum || refId || 'A1');
      return;
    }

    const txToUpdate = new Map<string, any>();
    const isLoanInvoice = Boolean(updates.isLoan ?? existingInv.isLoan);
    const loanTxType = updates.loanTransactionType || existingInv.loanTransactionType;
    let expectedTransactionType: 'EXPENSE' | 'INCOME';
    if (updates.transactionType) {
      expectedTransactionType = String(updates.transactionType).toUpperCase() as 'EXPENSE' | 'INCOME';
    } else if (isLoanInvoice) {
      expectedTransactionType = loanTxType === 'income' ? 'INCOME' : 'EXPENSE';
    } else {
      expectedTransactionType = 'INCOME';
    }
    const expectedTxType: 'expense' | 'income' =
      expectedTransactionType === 'EXPENSE' ? 'expense' : 'income';

    console.log(
      `[FinanceLedger Audit] [syncFinancialRecord:INVOICE] Beginning ledger sync for invoice ${invoiceId}: ` +
      `isLoan = ${isLoanInvoice}, loanTxType = ${loanTxType} => TARGET transactionType = "${expectedTransactionType}" (type: "${expectedTxType}")`
    );

    const qTxByRef = query(
      collection(db, 'transactions'),
      where('referenceId', '==', invoiceId)
    );
    const snapTxByRef = await getDocs(qTxByRef);
    snapTxByRef.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

    const qTxByLinkedRef = query(
      collection(db, 'transactions'),
      where('linkedInvoiceRef', '==', invoiceId)
    );
    const snapTxByLinkedRef = await getDocs(qTxByLinkedRef);
    snapTxByLinkedRef.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

    const qTxByEntityId = query(
      collection(db, 'transactions'),
      where('entityId', '==', invoiceId)
    );
    const snapTxByEntityId = await getDocs(qTxByEntityId);
    snapTxByEntityId.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

    if (refId) {
      const qTxByOrigRef = query(
        collection(db, 'transactions'),
        where('referenceId', '==', refId)
      );
      const snapTxByOrigRef = await getDocs(qTxByOrigRef);
      snapTxByOrigRef.docs.forEach((d) => txToUpdate.set(d.id, d.data()));
    }

    if (invNum && invNum.trim()) {
      const qTxByInv = query(
        collection(db, 'transactions'),
        where('paymentReference', '==', invNum.trim())
      );
      const snapTxByInv = await getDocs(qTxByInv);
      snapTxByInv.docs.forEach((d) => txToUpdate.set(d.id, d.data()));

      const qTxByInvNum = query(
        collection(db, 'transactions'),
        where('invoiceNumber', '==', invNum.trim())
      );
      const snapTxByInvNum = await getDocs(qTxByInvNum);
      snapTxByInvNum.docs.forEach((d) => txToUpdate.set(d.id, d.data()));
    }

    if (txToUpdate.size > 0) {
      for (const [txId, txData] of txToUpdate.entries()) {
        const resolvedInvNum =
          invNum ||
          existingInv.invoiceNumber ||
          updates.invoiceNumber ||
          txData?.invoiceNumber ||
          (existingInv.paymentReference && existingInv.paymentReference.startsWith('INV') ? existingInv.paymentReference : null) ||
          (txData?.paymentReference && txData.paymentReference.startsWith('INV') ? txData.paymentReference : null);

        const isPaymentTx = Boolean(
          txData.paymentId ||
          (txData.description && txData.description.toLowerCase().includes('payment')) ||
          (txData.category && txData.category.toLowerCase().includes('payment'))
        );

        const hasSub = metrics.subcontractorCost > 0;
        const txPayload: Record<string, any> = {
          subcontractorCost: hasSub ? metrics.subcontractorCost : 0,
          dealerCost: hasSub ? metrics.subcontractorCost : 0,
          customerBilled: metrics.customerBilled,
          netProfit: hasSub ? metrics.netProfit : 0,
          profitMargin: hasSub ? metrics.profitMargin : 0,
          profitMarginPercent: hasSub ? metrics.profitMarginPercent : 0,
          isProfitEdited: hasSub,
          isEdited: hasSub,
          isDirectTransaction: !hasSub,
          hasSubcontractorCost: hasSub,
          linkedInvoiceRef: invoiceId,
          referenceId: txData.referenceId || invoiceId,
          entityId: txData.entityId || invoiceId,
          entityType: 'INVOICE',
          updatedAt: new Date(),
        };

        if (resolvedInvNum) {
          txPayload.invoiceNumber = resolvedInvNum;
        }

        if (orderNum || txData.orderNumber || txData.orderId) {
          const ord = orderNum || txData.orderNumber || txData.orderId;
          txPayload.orderId = ord;
          txPayload.orderNumber = ord;
        }

        if (updates.paymentStatus) {
          txPayload.paymentStatus = updates.paymentStatus;
        }

        if (updates.vehicleId || existingInv.vehicleId) {
          txPayload.vehicleId = updates.vehicleId || existingInv.vehicleId;
        }
        if (updates.vehicleName || existingInv.vehicleName) {
          txPayload.vehicleName = updates.vehicleName || existingInv.vehicleName;
        }
        if (updates.customerId || existingInv.customerId) {
          txPayload.customerId = updates.customerId || existingInv.customerId;
        }
        if (updates.customerName || existingInv.customerName) {
          txPayload.customerName = updates.customerName || existingInv.customerName;
        }
        if (updates.groupId || existingInv.groupId) {
          txPayload.groupId = updates.groupId || existingInv.groupId;
        }
        if (updates.groupName || existingInv.groupName) {
          txPayload.groupName = updates.groupName || existingInv.groupName;
        }
        if (updates.departmentId || existingInv.departmentId) {
          txPayload.departmentId = updates.departmentId || existingInv.departmentId;
        }
        if (updates.departmentName || existingInv.departmentName) {
          txPayload.departmentName = updates.departmentName || existingInv.departmentName;
        }

        if (updates.payments && isPaymentTx && txData.paymentId) {
          const currentPayments = Array.isArray(updates.payments) ? updates.payments : [];
          const existsInUpdated = currentPayments.some((p: any) => String(p.id) === String(txData.paymentId));
          if (!existsInUpdated) {
            // Payment was deleted from invoice! Delete from transactions and finance_ledger
            syncBatch.delete(doc(db, 'transactions', txId));
            syncBatch.delete(doc(db, 'finance_ledger', txId));
            continue;
          }
        }

        if (isPaymentTx) {
          // Preserve payment integrity: payments are incoming credits, keep payment description
          txPayload.type = 'income';
          txPayload.transactionType = 'INCOME';
          if (updates.payments && txData.paymentId) {
            const currentPayments = Array.isArray(updates.payments) ? updates.payments : [];
            const matchingPay = currentPayments.find((p: any) => String(p.id) === String(txData.paymentId));
            if (matchingPay) {
              const payAmt = Number(matchingPay.amount || 0);
              txPayload.amount = payAmt;
              txPayload.grossBilling = payAmt;
              txPayload.paid = payAmt;
              txPayload.paidAmount = payAmt;
              txPayload.customerBilled = payAmt;
              if (matchingPay.method) txPayload.paymentMethod = matchingPay.method;
              if (matchingPay.date) txPayload.date = matchingPay.date instanceof Date ? matchingPay.date : new Date(matchingPay.date);
              if (matchingPay.reference) txPayload.paymentReference = matchingPay.reference;
            }
          }
          if (txData.description) {
            txPayload.description = txData.description;
          } else {
            txPayload.description = `Payment for Invoice #${resolvedInvNum || invoiceId.slice(0, 8)}`;
          }
          if (txData.category) {
            txPayload.category = txData.category;
          }
        } else {
          // Primary invoice transaction: sync full billed amount, paid, remaining, dates, accounts
          txPayload.amount = billedAmount;
          txPayload.grossBilling = billedAmount;
          txPayload.customerBilled = billedAmount;
          if (updates.paidAmount !== undefined) {
            txPayload.paidAmount = Number(updates.paidAmount);
            txPayload.paid = Number(updates.paidAmount);
          }
          if (updates.remainingAmount !== undefined) {
            txPayload.remainingAmount = Number(updates.remainingAmount);
            txPayload.owing = Number(updates.remainingAmount);
          }
          if (updates.date) {
            txPayload.date = updates.date instanceof Date ? updates.date : new Date(updates.date);
          }
          if (updates.accountTo || updates.accountId) {
            txPayload.accountsTo = updates.accountTo ? [updates.accountTo] : (updates.accountId ? [updates.accountId] : txData.accountsTo);
          }
          if (updates.accountFrom) {
            txPayload.accountsFrom = [updates.accountFrom];
          }

          const isExistingExpense =
            txData.type === 'expense' ||
            txData.transactionType === 'EXPENSE' ||
            txData.entryType === 'DEBIT' ||
            isMaintenanceLinked;

          if (isExistingExpense) {
            txPayload.type = 'expense';
            txPayload.transactionType = 'EXPENSE';
            txPayload.entryType = 'DEBIT';
            txPayload.category = updates.category || txData.category || 'Maintenance';
          } else {
            txPayload.type = expectedTxType;
            txPayload.transactionType = expectedTransactionType;
            txPayload.entryType = expectedTransactionType === 'EXPENSE' ? 'DEBIT' : 'CREDIT';
            txPayload.category = isLoanInvoice
              ? (updates.category || existingInv.category || (expectedTransactionType === 'INCOME' ? 'Loan Received' : 'Loan Provided'))
              : (updates.category || existingInv.category || 'Invoice');
          }

          txPayload.description =
            updates.description ||
            txData.description ||
            existingInv.description ||
            (isLoanInvoice
              ? (expectedTransactionType === 'INCOME'
                  ? `Loan Received (Income) for Invoice #${resolvedInvNum || invoiceId.slice(0, 8)}`
                  : `Loan for Invoice #${resolvedInvNum || invoiceId.slice(0, 8)}`)
              : `Invoice #${resolvedInvNum || invoiceId.slice(0, 8)}`);
        }

        syncBatch.update(doc(db, 'transactions', txId), sanitizeForFirestore(txPayload));
        syncBatch.set(doc(db, 'finance_ledger', txId), sanitizeForFirestore({ id: txId, ...txPayload }), { merge: true });
      }
    } else {
      if (isMaintenanceLinked) {
        console.log(
          `[FinanceLedger Audit] Skipping auto-creation of Income transaction for maintenance invoice ${invoiceId} (Order #${orderNum || 'N/A'}). Maintenance must only be recorded as EXPENSE.`
        );
        await syncBatch.commit();
        return;
      }

      // Create corresponding transaction in Finance Ledger for the invoice
      const resolvedInvNum = invNum || existingInv.invoiceNumber || updates.invoiceNumber;
      const newTxRef = doc(collection(db, 'transactions'));
      const newTx: Record<string, any> = {
        id: newTxRef.id,
        entityId: invoiceId,
        entityType: 'INVOICE',
        referenceId: invoiceId,
        linkedInvoiceRef: invoiceId,
        orderId: orderNum || null,
        orderNumber: orderNum || null,
        invoiceNumber: resolvedInvNum || null,
        paymentReference: resolvedInvNum || null,
        type: expectedTxType,
        transactionType: expectedTransactionType,
        category: isLoanInvoice
          ? (updates.category || existingInv.category || (expectedTransactionType === 'INCOME' ? 'Loan Received' : 'Loan Provided'))
          : (updates.category || existingInv.category || 'Invoice'),
        amount: billedAmount,
        customerBilled: billedAmount,
        dealerCost: subCost,
        subcontractorCost: subCost,
        netProfit: metrics.netProfit,
        profitMargin: metrics.profitMargin,
        profitMarginPercent: metrics.profitMarginPercent,
        isProfitEdited: true,
        isEdited: true,
        paymentStatus: updates.paymentStatus || existingInv.paymentStatus || 'unpaid',
        completionStatus: normalizeCompletionStatus(updates.status || existingInv.status || 'completed'),
        description: updates.description || existingInv.description || (isLoanInvoice ? (expectedTransactionType === 'INCOME' ? `Loan Received (Income) for Invoice #${resolvedInvNum || invoiceId.slice(0, 8)}` : `Loan for Invoice #${resolvedInvNum || invoiceId.slice(0, 8)}`) : `Invoice #${resolvedInvNum || invoiceId.slice(0, 8)}`),
        vehicleId: updates.vehicleId || existingInv.vehicleId || null,
        vehicleName: updates.vehicleName || existingInv.vehicleName || null,
        customerId: updates.customerId || existingInv.customerId || null,
        customerName: updates.customerName || existingInv.customerName || null,
        groupId: updates.groupId || existingInv.groupId || null,
        groupName: updates.groupName || existingInv.groupName || null,
        departmentId: updates.departmentId || existingInv.departmentId || null,
        departmentName: updates.departmentName || existingInv.departmentName || null,
        date: updates.date ? new Date(updates.date) : (existingInv.date ? new Date(existingInv.date) : new Date()),
        createdAt: new Date(),
        createdBy: updates.updatedBy || existingInv.createdBy || 'system',
      };

      console.log(
        `[FinanceLedger Audit] [UPSERT:INSERT] Pre-commit verification: creating new transaction ` +
        `in collection 'transactions' & 'finance_ledger' with invoiceNumber="${resolvedInvNum}", transactionType="${expectedTransactionType}", type="${expectedTxType}"`
      );

      syncBatch.set(newTxRef, sanitizeForFirestore(newTx));
      syncBatch.set(doc(db, 'finance_ledger', newTxRef.id), sanitizeForFirestore(newTx), { merge: true });
    }

    // Atomically commit batch write in a single roundtrip
    await syncBatch.commit();
    invalidateFinanceLedgerCache();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            entityId: invoiceId,
            action: 'UPDATE_INVOICE',
            timestamp: Date.now(),
          },
        })
      );
    }
  } catch (err) {
    console.warn('Error syncing linked transactions from invoice:', err);
  }

  // Real-time events & backend notification
  try {
    const eventDetail = {
      entityId: invoiceId,
      entityType: 'INVOICE',
      orderNumber: orderNum,
      invoiceNumber: invNum,
      customerBilled: billedAmount,
      dealerCost: subCost,
      subcontractorCost: subCost,
      netProfit: metrics.netProfit,
      profitMargin: metrics.profitMargin,
      profitMarginPercent: metrics.profitMarginPercent,
      paymentStatus: normalizePaymentStatus(updates.paymentStatus || existingInv.paymentStatus),
      completionStatus: normalizeCompletionStatus(updates.status || existingInv.status),
      timestamp: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invoiceRecordUpdated', { detail: eventDetail }));
      window.dispatchEvent(new CustomEvent('financeRecordUpdated', { detail: eventDetail }));
    }
    fetch('/api/finance/sync-adjustment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventDetail),
    }).catch(() => {});
  } catch {}
}

/**
 * 2-WAY SYNC FOR FINANCE PAGE:
 * Updates a transaction and propagates cost, subcontractorCost, customerBilled, profit,
 * paymentStatus, orderId, and invoiceNumber to linked MaintenanceLogs and Invoices in Firestore.
 */
export async function syncTransactionRecord(
  transactionId: string,
  updates: Record<string, any>
): Promise<void> {
  if (!transactionId) return;

  const txRef = doc(db, 'transactions', transactionId);
  const txSnap = await getDoc(txRef);
  const existingTx = txSnap.exists() ? txSnap.data() : {};

  const orderNum =
    updates.orderId ||
    updates.orderNumber ||
    existingTx.orderId ||
    existingTx.orderNumber;
  const invNum =
    updates.invoiceNumber ||
    updates.paymentReference ||
    existingTx.invoiceNumber ||
    existingTx.paymentReference;
  const refId = updates.referenceId || existingTx.referenceId;

  const billedAmount =
    updates.customerBilled !== undefined
      ? Number(updates.customerBilled)
      : updates.amount !== undefined
      ? Number(updates.amount)
      : Number(existingTx.customerBilled ?? existingTx.amount ?? 0);

  const subCost =
    updates.dealerCost !== undefined
      ? Number(updates.dealerCost)
      : updates.subcontractorCost !== undefined
      ? Number(updates.subcontractorCost)
      : Number(existingTx.dealerCost ?? existingTx.subcontractorCost ?? 0);

  const metrics = calculateProfitMetrics(billedAmount, subCost);

  // 1. Update the transaction itself
  const txPayload: Record<string, any> = {
    ...updates,
    subcontractorCost: metrics.subcontractorCost,
    dealerCost: metrics.subcontractorCost,
    customerBilled: metrics.customerBilled,
    netProfit: metrics.netProfit,
    profitMarginPercent: metrics.profitMarginPercent,
    isProfitEdited: true,
    isEdited: true,
    updatedAt: new Date(),
  };
  if (orderNum) {
    txPayload.orderId = orderNum;
    txPayload.orderNumber = orderNum;
  }
  if (invNum) {
    txPayload.invoiceNumber = invNum;
  }

  // Use unified writeBatch for transactions, finance_ledger, and rentals in a single roundtrip
  const syncBatch = writeBatch(db);
  syncBatch.update(txRef, sanitizeForFirestore(txPayload));
  syncBatch.set(
    doc(db, 'finance_ledger', transactionId),
    sanitizeForFirestore({
      id: transactionId,
      ...txPayload,
    }),
    { merge: true }
  );

  // 2. DIRECTIONAL EDITING HIERARCHY RULE:
  // EDITED ON FINANCE PAGE (Bottom-Level Ledger):
  // Edits made directly on the Finance page MUST remain isolated to the Finance Ledger entry.
  // Do NOT overwrite or alter original Maintenance or Invoice source records.

  // 3. Propagate to rentals (Reverse 2-Way Sync for Rental records)
  try {
    const rentalsToUpdate = new Map<string, any>();

    if (refId) {
      const rentSnap = await getDoc(doc(db, 'rentals', refId));
      if (rentSnap.exists()) rentalsToUpdate.set(refId, rentSnap.data());
    }

    if (existingTx.entityId && existingTx.entityType === 'RENTAL') {
      const rentSnap = await getDoc(doc(db, 'rentals', existingTx.entityId));
      if (rentSnap.exists()) rentalsToUpdate.set(existingTx.entityId, rentSnap.data());
    }

    if (orderNum && orderNum.trim()) {
      const qRentByOrd = query(
        collection(db, 'rentals'),
        where('rentalAgreementNumber', '==', orderNum.trim())
      );
      const snapRentByOrd = await getDocs(qRentByOrd);
      snapRentByOrd.docs.forEach((d) => rentalsToUpdate.set(d.id, d.data()));
    }

    for (const [rentDocId] of rentalsToUpdate.entries()) {
      const rentPayload: Record<string, any> = {
        customerBilled: metrics.customerBilled,
        cost: metrics.customerBilled,
        dealerCost: metrics.subcontractorCost,
        subcontractorCost: metrics.subcontractorCost,
        netProfit: metrics.netProfit,
        profitMargin: metrics.profitMargin,
        profitMarginPercent: metrics.profitMarginPercent,
        isEdited: true,
        updatedAt: new Date(),
      };
      if (updates.paymentStatus) {
        rentPayload.paymentStatus = updates.paymentStatus;
      }
      if (updates.completionStatus || updates.status) {
        rentPayload.status = normalizeCompletionStatus(updates.completionStatus || updates.status).toLowerCase();
      }
      syncBatch.update(doc(db, 'rentals', rentDocId), sanitizeForFirestore(rentPayload));
    }
  } catch (err) {
    console.warn('Error syncing linked rentals from transaction:', err);
  }

  // Commit all writes in a single roundtrip
  await syncBatch.commit();

  // Real-time events & backend notification
  try {
    const syncDetail = {
      entityId: transactionId,
      entityType: existingTx.entityType || 'FINANCE',
      referenceId: refId,
      orderNumber: orderNum,
      invoiceNumber: invNum,
      customerBilled: metrics.customerBilled,
      dealerCost: metrics.subcontractorCost,
      subcontractorCost: metrics.subcontractorCost,
      netProfit: metrics.netProfit,
      profitMargin: metrics.profitMargin,
      profitMarginPercent: metrics.profitMarginPercent,
      paymentStatus: normalizePaymentStatus(updates.paymentStatus || existingTx.paymentStatus),
      completionStatus: normalizeCompletionStatus(updates.completionStatus || updates.status || existingTx.completionStatus || existingTx.status),
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('financeRecordUpdated', { detail: syncDetail }));
      window.dispatchEvent(new CustomEvent('maintenanceRecordUpdated', { detail: syncDetail }));
      window.dispatchEvent(new CustomEvent('invoiceRecordUpdated', { detail: syncDetail }));
      window.dispatchEvent(new CustomEvent('rentalRecordUpdated', { detail: syncDetail }));
    }

    fetch('/api/finance/sync-adjustment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(syncDetail),
    }).catch(() => {});
  } catch {}
}

/**
 * Universal Master Sync Dispatcher
 * Routes creation / update / deletion to the appropriate module sync handler
 */
export async function syncCrossModuleRecord(
  entityType: 'RENTAL' | 'INVOICE' | 'MAINTENANCE' | 'FINANCE',
  entityId: string,
  updates: Record<string, any>
): Promise<void> {
  if (!entityId) return;

  switch (entityType) {
    case 'RENTAL':
      await syncRentalRecord(entityId, updates);
      break;
    case 'INVOICE':
      await syncInvoiceRecord(entityId, updates);
      break;
    case 'MAINTENANCE':
      await syncMaintenanceRecord(entityId, updates);
      break;
    case 'FINANCE':
      await syncTransactionRecord(entityId, updates);
      break;
    default:
      console.warn(`[unifiedSync] Unknown entityType: ${entityType}`);
  }
}

/**
 * Alias for syncCrossModuleRecord to provide standardized financial sync invocation
 */
export const syncFinancialRecord = syncCrossModuleRecord;

/**
 * Automatically purges any orphaned Income transactions in Firestore that are tied to
 * Maintenance orders (such as Order #A1 or any maintenance job).
 * This eliminates double-entry duplication and restores balance to Finance metrics.
 */
export async function purgeOrphanedMaintenanceIncomeEntries(targetOrder?: string): Promise<number> {
  let purgedCount = 0;
  try {
    const txCol = collection(db, 'transactions');
    const snap = await getDocs(query(txCol));
    const normTarget = targetOrder ? normalizeOrderRef(targetOrder) : '';
    const targetVariants = targetOrder ? getOrderCandidateVariants(targetOrder) : [];

    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const typeStr = (d.type || '').toLowerCase();
      const txTypeStr = (d.transactionType || '').toUpperCase();
      const entryTypeStr = (d.entryType || '').toUpperCase();
      const isIncome = typeStr === 'income' || txTypeStr === 'INCOME' || entryTypeStr === 'CREDIT';

      if (!isIncome) continue;
      // Protect legitimate invoice payments
      if (d.paymentId || d.entityType === 'INVOICE' || d.invoiceId || (d as any).isInvoicePayment) continue;

      const orderVal = String(d.orderId || d.orderNumber || d.maintenanceOrderId || '').trim();
      const normOrder = normalizeOrderRef(orderVal);
      const desc = String(d.description || '').toLowerCase();
      const cat = String(d.category || '').toLowerCase();
      const entity = String(d.entityType || '').toUpperCase();
      const invNum = String(d.invoiceNumber || d.paymentReference || '').toLowerCase();

      const isA1 =
        normOrder === 'a1' ||
        orderVal.toLowerCase() === 'a1' ||
        orderVal.toLowerCase() === '#a1' ||
        orderVal.toLowerCase().includes('a1') ||
        desc.includes('order: #a1') ||
        desc.includes('order: a1') ||
        desc.includes('order #a1') ||
        desc.includes('order a1') ||
        desc.includes('#a1') ||
        invNum.includes('a1');

      const isMaintenanceJob =
        cat === 'maintenance' ||
        entity === 'MAINTENANCE' ||
        desc.includes('maintenance job') ||
        desc.includes('maintenance expense') ||
        Boolean(d.maintenanceJobId) ||
        Boolean(d.maintenanceOrderId);

      let matchesTarget = true;
      if (targetOrder) {
        matchesTarget =
          (normTarget && normOrder === normTarget) ||
          targetVariants.some(v => v.toLowerCase() === orderVal.toLowerCase()) ||
          (normTarget && desc.includes(normTarget)) ||
          (normTarget && invNum.includes(normTarget));
      }

      if ((isA1 || isMaintenanceJob) && matchesTarget) {
        console.log(
          `[FinanceLedger Cleanup] Purging orphaned Income transaction ${docSnap.id} for order "${orderVal || targetOrder}"`
        );
        await deleteDoc(doc(db, 'transactions', docSnap.id)).catch(() => {});
        try {
          await deleteDoc(doc(db, 'finance_ledger', docSnap.id)).catch(() => {});
        } catch {
          // ignore
        }
        purgedCount++;
      }
    }
  } catch (err) {
    console.warn('Error running purgeOrphanedMaintenanceIncomeEntries:', err);
  }
  return purgedCount;
}



