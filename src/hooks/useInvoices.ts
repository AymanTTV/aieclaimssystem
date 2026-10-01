// src/hooks/useInvoices.ts
import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice } from '../types';

export const useInvoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleInvoiceEvent = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;

      setInvoices((prev) => {
        if (detail.action === 'DELETE_INVOICE' && detail.id) {
          return prev.filter((inv) => inv.id !== detail.id);
        }
        if (detail.action === 'CREATE_INVOICE' && detail.id) {
          const exists = prev.some((inv) => inv.id === detail.id);
          if (exists) return prev;
          return [detail as Invoice, ...prev];
        }

        const targetId = detail.id || detail.entityId;
        const idx = prev.findIndex((inv) => inv.id === targetId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            ...detail,
            paidAmount: detail.paidAmount !== undefined ? Number(detail.paidAmount) : updated[idx].paidAmount,
            remainingAmount: detail.remainingAmount !== undefined ? Number(detail.remainingAmount) : updated[idx].remainingAmount,
            paymentStatus: detail.paymentStatus || updated[idx].paymentStatus,
            payments: detail.payments || updated[idx].payments,
          };
          return updated;
        }
        return prev;
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('invoiceRecordUpdated', handleInvoiceEvent);
    }

    const q = query(collection(db, 'invoices'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const invoiceData: Invoice[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          
          // Safe date parser to prevent crashes on missing/malformed dates
          const safeDate = (dateVal: any) => {
            if (!dateVal) return new Date();
            if (typeof dateVal.toDate === 'function') return dateVal.toDate();
            if (dateVal instanceof Date) return dateVal;
            return new Date(dateVal);
          };

          const totalNum = Number(data.total ?? data.amount ?? 0);
          const customerBilledNum = data.customerBilled !== undefined ? Number(data.customerBilled) : totalNum;
          const subCostNum = data.subcontractorCost !== undefined ? Number(data.subcontractorCost) : undefined;
          let netProfit = data.netProfit !== undefined ? Number(data.netProfit) : undefined;
          let profitMarginPercent = data.profitMarginPercent !== undefined ? Number(data.profitMarginPercent) : undefined;
          if (subCostNum !== undefined && netProfit === undefined) {
            netProfit = Number((customerBilledNum - subCostNum).toFixed(2));
            profitMarginPercent = customerBilledNum > 0 ? Number(((netProfit / customerBilledNum) * 100).toFixed(2)) : 0;
          }

          invoiceData.push({
            id: doc.id,
            ...data,
            orderId: data.orderId || data.orderNumber,
            orderNumber: data.orderNumber || data.orderId,
            invoiceNumber: data.invoiceNumber,
            customerBilled: customerBilledNum,
            subcontractorCost: subCostNum,
            netProfit,
            profitMarginPercent,
            date: safeDate(data.date),
            dueDate: safeDate(data.dueDate),
            createdAt: safeDate(data.createdAt),
            updatedAt: safeDate(data.updatedAt),
            payments: data.payments || [], // Ensure payments array exists
          } as Invoice);
        });
        setInvoices(invoiceData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching invoices:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('invoiceRecordUpdated', handleInvoiceEvent);
      }
    };
  }, []);

  return { invoices, loading };
};