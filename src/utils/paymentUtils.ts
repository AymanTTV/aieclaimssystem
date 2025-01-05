import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Rental, RentalPayment, Invoice, InvoicePayment } from '../types';
import { createFinanceTransaction } from './financeTransactions';
import toast from 'react-hot-toast';

/**
 * Delete a rental payment
 */
export const deleteRentalPayment = async (rental: Rental, paymentId: string): Promise<boolean> => {
  try {
    const payment = rental.payments.find(p => p.id === paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Calculate new totals
    const newPaidAmount = rental.paidAmount - payment.amount;
    const newRemainingAmount = rental.cost - newPaidAmount;
    const newPaymentStatus = newPaidAmount === 0 ? 'pending' : 
                           newPaidAmount === rental.cost ? 'paid' : 
                           'partially_paid';

    // Update rental record
    await updateDoc(doc(db, 'rentals', rental.id), {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newPaymentStatus,
      payments: rental.payments.filter(p => p.id !== paymentId),
      updatedAt: new Date()
    });

    // Create reversal transaction
    await createFinanceTransaction({
      type: 'expense',
      category: 'payment_reversal',
      amount: payment.amount,
      description: `Payment reversal for rental #${rental.id.slice(-8).toUpperCase()}`,
      referenceId: rental.id,
      vehicleId: rental.vehicleId,
      paymentStatus: newPaymentStatus
    });

    return true;
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

/**
 * Delete an invoice payment
 */
export const deleteInvoicePayment = async (invoice: Invoice, paymentId: string): Promise<boolean> => {
  try {
    const payment = invoice.payments.find(p => p.id === paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Calculate new totals
    const newPaidAmount = invoice.paidAmount - payment.amount;
    const newRemainingAmount = invoice.amount - newPaidAmount;
    const newPaymentStatus = newPaidAmount === 0 ? 'pending' : 
                           newPaidAmount === invoice.amount ? 'paid' : 
                           'partially_paid';

    // Update invoice record
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

    return true;
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};