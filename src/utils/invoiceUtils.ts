import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Invoice } from '../types';
import { createFinanceTransaction } from './financeTransactions';
import toast from 'react-hot-toast';

export const markInvoiceAsPaid = async (invoice: Invoice) => {
  try {
    await updateDoc(doc(db, 'invoices', invoice.id), {
      paymentStatus: 'paid',
      updatedAt: new Date()
    });

    // Create finance transaction
    await createFinanceTransaction({
      type: 'income',
      category: invoice.category,
      amount: invoice.amount,
      description: `Payment received for invoice #${invoice.id.slice(-8).toUpperCase()}`,
      referenceId: invoice.id,
      vehicleId: invoice.vehicleId,
      status: 'completed'
    });

    toast.success('Invoice marked as paid');
    return true;
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    toast.error('Failed to mark invoice as paid');
    return false;
  }
};

export const isInvoiceOverdue = (invoice: Invoice): boolean => {
  return invoice.paymentStatus === 'unpaid' && new Date() > invoice.dueDate;
};
