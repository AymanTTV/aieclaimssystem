import { doc, updateDoc, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice, InvoicePayment } from '../types';
import { createFinanceTransaction, reverseFinanceTransaction } from './financeTransactions';
import { invalidateFinanceLedgerCache, manuallyRefetchFinanceLedger } from '../state/financeLedgerAtom';
import toast from 'react-hot-toast';

/**
 * Mark an invoice as fully paid
 */
export const markInvoiceAsPaid = async (invoice: Invoice): Promise<boolean> => {
  try {
    const payment: InvoicePayment = {
      id: Date.now().toString(),
      date: new Date(),
      amount: invoice.remainingAmount,
      method: 'cash',
      createdAt: new Date(),
      createdBy: 'system'
    };

    await updateDoc(doc(db, 'invoices', invoice.id), {
      paidAmount: invoice.amount,
      remainingAmount: 0,
      paymentStatus: 'paid',
      payments: [...(invoice.payments || []), payment],
      updatedAt: new Date()
    });

    await createFinanceTransaction({
      type: 'income',
      category: invoice.category,
      amount: invoice.remainingAmount,
      description: `Full payment for invoice #${invoice.id.slice(-8).toUpperCase()}`,
      referenceId: invoice.id,
      vehicleId: invoice.vehicleId,
      paymentStatus: 'paid'
    });

    toast.success('Invoice marked as paid');
    return true;
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    toast.error('Failed to mark invoice as paid');
    return false;
  }
};

/**
 * Delete a specific payment from an invoice
 */
export const deleteInvoicePayment = async (invoice: Invoice, paymentId: string): Promise<boolean> => {
  try {
    const payment = invoice.payments.find(p => p.id === paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Calculate new payment totals
    const newPaidAmount = invoice.paidAmount - payment.amount;
    const newRemainingAmount = invoice.amount - newPaidAmount;
    const newPaymentStatus = newPaidAmount === 0 ? 'pending' : 
                           newPaidAmount === invoice.amount ? 'paid' : 
                           'partially_paid';

    // Update invoice
    await updateDoc(doc(db, 'invoices', invoice.id), {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newPaymentStatus,
      payments: invoice.payments.filter(p => p.id !== paymentId),
      updatedAt: new Date()
    });

    // Purge linked income transaction from finance ledger
    await reverseFinanceTransaction({
      referenceId: invoice.id,
      invoiceId: invoice.id,
      paymentId: paymentId,
      amount: payment.amount,
    });

    // Call backend API to delete payment from server ledger
    try {
      const apiRes = await fetch(`/api/invoices/${invoice.id}/payments/${paymentId}`, {
        method: 'DELETE',
      });
      if (!apiRes.ok) {
        console.warn(`Backend delete payment API returned status ${apiRes.status}`);
      }
    } catch (apiErr) {
      console.warn('Backend payment delete notice:', apiErr);
    }

    // Cache invalidation pattern:
    // Immediately update global state atom and manually re-fetch finance ledger
    invalidateFinanceLedgerCache(paymentId);
    await manuallyRefetchFinanceLedger().catch((fetchErr) => {
      console.warn('Manual ledger re-fetch notice:', fetchErr);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            entityId: invoice.id,
            deletedPaymentId: paymentId,
          },
        })
      );
      window.dispatchEvent(
        new CustomEvent('invoiceRecordUpdated', {
          detail: {
            id: invoice.id,
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            paymentStatus: newPaymentStatus,
            payments: invoice.payments.filter(p => p.id !== paymentId),
          },
        })
      );
    }

    toast.success('Payment deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting payment:', error);
    toast.error('Failed to delete payment');
    return false;
  }
};

/**
 * Check if an invoice is overdue
 */
export const isInvoiceOverdue = (invoice: Invoice): boolean => {
  return invoice.paymentStatus === 'pending' && new Date() > invoice.dueDate;
};

/**
 * Calculate payment status based on amounts
 */
export const calculatePaymentStatus = (
  totalAmount: number,
  paidAmount: number
): Invoice['paymentStatus'] => {
  if (paidAmount === 0) return 'pending';
  if (paidAmount === totalAmount) return 'paid';
  return 'partially_paid';
};