import { doc, updateDoc, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice, InvoicePayment } from '../types';
import { createFinanceTransaction } from './financeTransactions';
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

    // Create reversal transaction
    await createFinanceTransaction({
      type: 'expense',
      category: 'payment_reversal',
      amount: payment.amount,
      description: `Payment reversal for invoice #${invoice.id.slice(-8).toUpperCase()}`,
      referenceId: invoice.id,
      vehicleId: invoice.vehicleId,
      paymentStatus: newPaymentStatus
    });

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