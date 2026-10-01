// src/hooks/useFinances.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types';
import { enrichTransactionWithMaintenance } from '../utils/maintenanceFinanceLink';
import { subscribeFinanceLedger, getFinanceLedgerState } from '../state/financeLedgerAtom';

const safeDate = (dateVal: any) => {
  if (!dateVal) return new Date();
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (dateVal instanceof Date) return dateVal;
  return new Date(dateVal);
};

export const useFinances = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rawTransactionsRef = useRef<Transaction[]>([]);
  const maintenanceLogsRef = useRef<any[]>([]);
  const invoicesRef = useRef<any[]>([]);

  useEffect(() => {
    const qTx = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const qLogs = collection(db, 'maintenanceLogs');
    const qInvoices = collection(db, 'invoices');

    const rebuildAndSet = () => {
      const rawList = rawTransactionsRef.current;
      const logsList = maintenanceLogsRef.current;
      const invList = invoicesRef.current;

      const enriched = rawList.map((t) => {
        let enrichedTxn = enrichTransactionWithMaintenance(t, logsList);

        // Find linked invoice if present
        const refId = enrichedTxn.linkedInvoiceRef || enrichedTxn.referenceId || enrichedTxn.entityId;
        const matchingInvoice =
          (refId && invList.find((inv) => inv.id === refId)) ||
          (enrichedTxn.invoiceNumber &&
            invList.find((inv) => inv.invoiceNumber && inv.invoiceNumber === enrichedTxn.invoiceNumber)) ||
          (enrichedTxn.paymentReference &&
            enrichedTxn.paymentReference.startsWith('INV') &&
            invList.find((inv) => inv.invoiceNumber === enrichedTxn.paymentReference));

        if (matchingInvoice) {
          const invNum =
            matchingInvoice.invoiceNumber ||
            enrichedTxn.invoiceNumber ||
            (enrichedTxn.paymentReference && enrichedTxn.paymentReference.startsWith('INV')
              ? enrichedTxn.paymentReference
              : undefined);

          enrichedTxn = {
            ...enrichedTxn,
            invoiceNumber: invNum,
            linkedInvoiceRef: matchingInvoice.id,
            entityId: enrichedTxn.entityId || matchingInvoice.id,
            entityType: 'INVOICE',
            orderId: enrichedTxn.orderId || matchingInvoice.orderNumber || matchingInvoice.orderId || null,
            orderNumber: enrichedTxn.orderNumber || matchingInvoice.orderNumber || matchingInvoice.orderId || null,
            customerBilled:
              enrichedTxn.customerBilled !== undefined
                ? enrichedTxn.customerBilled
                : matchingInvoice.total || matchingInvoice.amount,
            documentUrl: enrichedTxn.documentUrl || matchingInvoice.documentUrl,
          };
        }

        return enrichedTxn;
      });

      setTransactions(enriched);
      setLoading(false);
    };

    const unsubTx = onSnapshot(
      qTx,
      (snapshot) => {
        const transactionData: Transaction[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const amt = Number(data.amount || 0);
          const customerBilledNum =
            data.customerBilled !== undefined ? Number(data.customerBilled) : amt;

          const rawSubCost =
            data.dealerCost !== undefined && data.dealerCost !== null && data.dealerCost !== ''
              ? Number(data.dealerCost)
              : data.subcontractorCost !== undefined && data.subcontractorCost !== null && data.subcontractorCost !== ''
              ? Number(data.subcontractorCost)
              : undefined;

          const hasExplicitDealer = rawSubCost !== undefined && !isNaN(rawSubCost);
          const isProfitEdited = (data.isProfitEdited === true || data.isEdited === true) && hasExplicitDealer;

          const subCostNum = hasExplicitDealer ? rawSubCost : undefined;

          const netProfit = hasExplicitDealer
            ? data.netProfit !== undefined
              ? Number(data.netProfit)
              : Number((customerBilledNum - (subCostNum ?? 0)).toFixed(2))
            : undefined;

          const profitMarginPercent = hasExplicitDealer
            ? data.profitMarginPercent !== undefined
              ? Number(data.profitMarginPercent)
              : customerBilledNum > 0 && netProfit !== undefined
              ? Number(((netProfit / customerBilledNum) * 100).toFixed(2))
              : 0
            : undefined;

          return {
            id: docSnap.id,
            ...data,
            isProfitEdited,
            isEdited: isProfitEdited,
            orderId: data.orderId || data.orderNumber || null,
            orderNumber: data.orderNumber || data.orderId || null,
            invoiceNumber: data.invoiceNumber || data.paymentReference || null,
            customerBilled: customerBilledNum,
            subcontractorCost: subCostNum ?? null,
            dealerCost: subCostNum ?? null,
            netProfit: netProfit ?? null,
            profitMarginPercent: profitMarginPercent ?? null,
            linkedInvoiceRef: data.linkedInvoiceRef || data.referenceId || null,
            date: safeDate(data.date),
            createdAt: safeDate(data.createdAt),
          } as Transaction;
        });

        const atomState = getFinanceLedgerState();
        const filtered = atomState.deletedPaymentIds && atomState.deletedPaymentIds.size > 0
          ? transactionData.filter((t) => {
              if (t.paymentId && atomState.deletedPaymentIds.has(String(t.paymentId))) return false;
              if (t.id && atomState.deletedPaymentIds.has(String(t.id))) return false;
              if (t.paymentReference && atomState.deletedPaymentIds.has(String(t.paymentReference))) return false;
              return true;
            })
          : transactionData;

        rawTransactionsRef.current = filtered;
        rebuildAndSet();
      },
      (err) => {
        console.error('Error fetching transactions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubLogs = onSnapshot(
      qLogs,
      (snapshot) => {
        maintenanceLogsRef.current = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        rebuildAndSet();
      },
      (err) => {
        console.warn('Warning listening to maintenance logs in useFinances:', err);
      }
    );

    const unsubInvoices = onSnapshot(
      qInvoices,
      (snapshot) => {
        invoicesRef.current = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        rebuildAndSet();
      },
      (err) => {
        console.warn('Warning listening to invoices in useFinances:', err);
      }
    );

    const handleEventUpdate = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;

      // 1. If a payment was deleted, remove it immediately from transactions cache
      if (detail.deletedPaymentId && rawTransactionsRef.current) {
        const delId = String(detail.deletedPaymentId);
        rawTransactionsRef.current = rawTransactionsRef.current.filter((t) => {
          if (t.paymentId && String(t.paymentId) === delId) return false;
          if (t.id && String(t.id) === delId) return false;
          if (t.paymentReference && String(t.paymentReference) === delId) return false;
          return true;
        });
        rebuildAndSet();
        return;
      }

      // Update maintenance cache if relevant
      if (maintenanceLogsRef.current) {
        const idx = maintenanceLogsRef.current.findIndex(
          (m) =>
            m.id === detail.logId ||
            m.id === detail.entityId ||
            (detail.orderNumber && m.orderNumber === detail.orderNumber)
        );
        if (idx >= 0) {
          maintenanceLogsRef.current[idx] = {
            ...maintenanceLogsRef.current[idx],
            ...detail,
          };
        } else if (detail.entityType === 'MAINTENANCE' && detail.entityId) {
          maintenanceLogsRef.current.push({ id: detail.entityId, ...detail });
        }
      }

      // Update transaction cache if relevant
      if (rawTransactionsRef.current) {
        // Look for matching payment or transaction
        const txIdx = rawTransactionsRef.current.findIndex(
          (t) =>
            (detail.id && t.id === detail.id) ||
            (detail.paymentId && t.paymentId === detail.paymentId) ||
            (detail.entityId && (t.id === detail.entityId || t.referenceId === detail.entityId || t.entityId === detail.entityId)) ||
            (detail.orderNumber && (t.orderNumber === detail.orderNumber || t.orderId === detail.orderNumber))
        );

        if (txIdx >= 0) {
          rawTransactionsRef.current[txIdx] = {
            ...rawTransactionsRef.current[txIdx],
            ...detail,
            amount: detail.amount !== undefined ? Number(detail.amount) : rawTransactionsRef.current[txIdx].amount,
            grossBilling: detail.grossBilling !== undefined ? Number(detail.grossBilling) : (detail.amount !== undefined ? Number(detail.amount) : rawTransactionsRef.current[txIdx].grossBilling),
            paid: detail.paid !== undefined ? Number(detail.paid) : (detail.amount !== undefined ? Number(detail.amount) : rawTransactionsRef.current[txIdx].paid),
            paidAmount: detail.paidAmount !== undefined ? Number(detail.paidAmount) : (detail.amount !== undefined ? Number(detail.amount) : rawTransactionsRef.current[txIdx].paidAmount),
            owing: detail.owing !== undefined ? Number(detail.owing) : 0,
            remainingAmount: detail.remainingAmount !== undefined ? Number(detail.remainingAmount) : 0,
            customerBilled: detail.customerBilled !== undefined ? Number(detail.customerBilled) : rawTransactionsRef.current[txIdx].customerBilled,
            dealerCost: detail.dealerCost !== undefined ? Number(detail.dealerCost) : (detail.subcontractorCost !== undefined ? Number(detail.subcontractorCost) : rawTransactionsRef.current[txIdx].dealerCost),
            subcontractorCost: detail.subcontractorCost !== undefined ? Number(detail.subcontractorCost) : (detail.dealerCost !== undefined ? Number(detail.dealerCost) : rawTransactionsRef.current[txIdx].subcontractorCost),
            netProfit: detail.netProfit !== undefined ? Number(detail.netProfit) : rawTransactionsRef.current[txIdx].netProfit,
            profitMarginPercent: detail.profitMarginPercent !== undefined ? Number(detail.profitMarginPercent) : (detail.profitMargin !== undefined ? Number(detail.profitMargin) : rawTransactionsRef.current[txIdx].profitMarginPercent),
            paymentStatus: detail.paymentStatus || rawTransactionsRef.current[txIdx].paymentStatus,
            isProfitEdited: true,
            isEdited: true,
          };
        } else if (detail.amount !== undefined && (String(detail.type || detail.transactionType || '').toUpperCase() === 'INCOME')) {
          // If not found in cache and is an Income entry, insert directly into rawTransactionsRef.current
          const newTxn: Transaction = {
            id: detail.id || `txn_${Date.now()}`,
            type: 'income',
            transactionType: 'INCOME',
            entryType: 'CREDIT',
            category: detail.category || 'Invoice Payment',
            amount: Number(detail.amount || 0),
            grossBilling: Number(detail.grossBilling ?? detail.amount ?? 0),
            paid: Number(detail.paid ?? detail.amount ?? 0),
            paidAmount: Number(detail.paidAmount ?? detail.amount ?? 0),
            owing: Number(detail.owing ?? 0),
            remainingAmount: Number(detail.remainingAmount ?? 0),
            customerBilled: Number(detail.customerBilled ?? detail.amount ?? 0),
            dealerCost: Number(detail.dealerCost ?? detail.subcontractorCost ?? 0),
            subcontractorCost: Number(detail.subcontractorCost ?? detail.dealerCost ?? 0),
            netProfit: Number(detail.netProfit ?? 0),
            profitMarginPercent: Number(detail.profitMarginPercent ?? 0),
            isProfitEdited: true,
            isEdited: true,
            description: detail.description || `Payment for Invoice #${detail.invoiceNumber || ''}`,
            paymentMethod: detail.paymentMethod || 'cash',
            paymentReference: detail.paymentReference || '',
            paymentId: detail.paymentId || '',
            paymentStatus: detail.paymentStatus || 'paid',
            status: 'completed',
            date: detail.date ? new Date(detail.date) : new Date(),
            createdAt: new Date(),
            invoiceId: detail.invoiceId || detail.entityId,
            referenceId: detail.referenceId || detail.invoiceId || detail.entityId,
            linkedInvoiceRef: detail.linkedInvoiceRef || detail.invoiceId || detail.entityId,
            entityId: detail.entityId || detail.invoiceId,
            entityType: 'INVOICE',
            invoiceNumber: detail.invoiceNumber,
            customerId: detail.customerId,
            customerName: detail.customerName,
            vehicleId: detail.vehicleId,
            vehicleName: detail.vehicleName,
            accountsTo: detail.accountsTo || [],
            accountsFrom: [],
          } as Transaction;
          rawTransactionsRef.current = [newTxn, ...rawTransactionsRef.current];
        }
      }

      rebuildAndSet();
    };

    // Subscribe to global finance ledger atom for cache invalidation events
    const unsubAtom = subscribeFinanceLedger((state) => {
      if (state.deletedPaymentIds && state.deletedPaymentIds.size > 0 && rawTransactionsRef.current) {
        let changed = false;
        rawTransactionsRef.current = rawTransactionsRef.current.filter((t) => {
          if (t.paymentId && state.deletedPaymentIds.has(String(t.paymentId))) {
            changed = true;
            return false;
          }
          if (t.id && state.deletedPaymentIds.has(String(t.id))) {
            changed = true;
            return false;
          }
          if (t.paymentReference && state.deletedPaymentIds.has(String(t.paymentReference))) {
            changed = true;
            return false;
          }
          return true;
        });
        if (changed) {
          rebuildAndSet();
        }
      }
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('maintenanceRecordUpdated', handleEventUpdate);
      window.addEventListener('maintenanceCostUpdated', handleEventUpdate);
      window.addEventListener('financeRecordUpdated', handleEventUpdate);
      window.addEventListener('rentalRecordUpdated', handleEventUpdate);
      window.addEventListener('invoiceRecordUpdated', handleEventUpdate);
    }

    return () => {
      unsubAtom();
      unsubTx();
      unsubLogs();
      unsubInvoices();
      if (typeof window !== 'undefined') {
        window.removeEventListener('maintenanceRecordUpdated', handleEventUpdate);
        window.removeEventListener('maintenanceCostUpdated', handleEventUpdate);
        window.removeEventListener('financeRecordUpdated', handleEventUpdate);
        window.removeEventListener('rentalRecordUpdated', handleEventUpdate);
        window.removeEventListener('invoiceRecordUpdated', handleEventUpdate);
      }
    };
  }, []);

  const refetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const qTx = query(collection(db, 'transactions'), orderBy('date', 'desc'));
      const snapshot = await getDocs(qTx);
      const transactionData: Transaction[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const amt = Number(data.amount || 0);
        const customerBilledNum =
          data.customerBilled !== undefined ? Number(data.customerBilled) : amt;

        const rawSubCost =
          data.dealerCost !== undefined && data.dealerCost !== null && data.dealerCost !== ''
            ? Number(data.dealerCost)
            : data.subcontractorCost !== undefined && data.subcontractorCost !== null && data.subcontractorCost !== ''
            ? Number(data.subcontractorCost)
            : undefined;

        const hasExplicitDealer = rawSubCost !== undefined && !isNaN(rawSubCost);
        const isProfitEdited = (data.isProfitEdited === true || data.isEdited === true) && hasExplicitDealer;
        const subCostNum = hasExplicitDealer ? rawSubCost : undefined;

        const netProfit = hasExplicitDealer
          ? data.netProfit !== undefined
            ? Number(data.netProfit)
            : Number((customerBilledNum - (subCostNum ?? 0)).toFixed(2))
          : undefined;

        const profitMarginPercent = hasExplicitDealer
          ? data.profitMarginPercent !== undefined
            ? Number(data.profitMarginPercent)
            : customerBilledNum > 0 && netProfit !== undefined
            ? Number(((netProfit / customerBilledNum) * 100).toFixed(2))
            : 0
          : undefined;

        return {
          id: docSnap.id,
          ...data,
          isProfitEdited,
          isEdited: isProfitEdited,
          orderId: data.orderId || data.orderNumber || null,
          orderNumber: data.orderNumber || data.orderId || null,
          invoiceNumber: data.invoiceNumber || data.paymentReference || null,
          customerBilled: customerBilledNum,
          subcontractorCost: subCostNum ?? null,
          dealerCost: subCostNum ?? null,
          netProfit: netProfit ?? null,
          profitMarginPercent: profitMarginPercent ?? null,
          linkedInvoiceRef: data.linkedInvoiceRef || data.referenceId || null,
          date: safeDate(data.date),
          createdAt: safeDate(data.createdAt),
        } as Transaction;
      });

      const atomState = getFinanceLedgerState();
      const filtered = atomState.deletedPaymentIds && atomState.deletedPaymentIds.size > 0
        ? transactionData.filter((t) => {
            if (t.paymentId && atomState.deletedPaymentIds.has(String(t.paymentId))) return false;
            if (t.id && atomState.deletedPaymentIds.has(String(t.id))) return false;
            if (t.paymentReference && atomState.deletedPaymentIds.has(String(t.paymentReference))) return false;
            return true;
          })
        : transactionData;

      rawTransactionsRef.current = filtered;
      setTransactions(filtered);
    } catch (err: any) {
      console.error('Failed to refetch transactions in useFinances:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { transactions, loading, error, refetchTransactions };
};