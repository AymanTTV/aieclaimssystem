import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Rental } from '../types';
import { createFinanceTransaction } from './financeTransactions';

export const createRentalTransaction = async (rental: Rental) => {
  try {
    if (rental.paidAmount && rental.paidAmount > 0) {
      const paymentRef = rental.rentalAgreementNumber || rental.paymentReference || (rental.id ? `RA-${rental.id.slice(-6).toUpperCase()}` : '');
      await createFinanceTransaction({
        type: 'income',
        transactionType: 'INCOME',
        entryType: 'CREDIT',
        category: 'Vehicle Rental Income',
        departmentName: 'Vehicle Rental / Fleet',
        amount: rental.paidAmount,
        customerBilled: rental.paidAmount,
        grossBilling: rental.paidAmount,
        paid: rental.paidAmount,
        paidAmount: rental.paidAmount,
        description: `Rental payment for #${paymentRef} (${rental.type} rental)`,
        referenceId: rental.id,
        sourceReferenceId: rental.id,
        linkedInvoiceRef: rental.id,
        entityId: rental.id,
        entityType: 'RENTAL',
        vehicleId: rental.vehicleId,
        paymentStatus: (rental.paymentStatus === 'paid' ? 'paid' : (rental.paymentStatus === 'partially_paid' ? 'partially_paid' : 'unpaid')) as any,
        paymentMethod: rental.paymentMethod,
        paymentReference: paymentRef,
        orderNumber: rental.rentalAgreementNumber || undefined,
        status: 'completed',
        date: new Date(),
      });
    }
  } catch (error) {
    console.error('Error creating rental transaction:', error);
    throw error;
  }
};

export const updateRentalTransaction = async (rental: Rental) => {
  try {
    const transactionsRef = collection(db, 'transactions');
    const q = query(transactionsRef, where('referenceId', '==', rental.id));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const paymentRef = rental.rentalAgreementNumber || rental.paymentReference || (rental.id ? `RA-${rental.id.slice(-6).toUpperCase()}` : '');
      const updates = {
        amount: rental.paidAmount || 0,
        customerBilled: rental.paidAmount || 0,
        paid: rental.paidAmount || 0,
        paidAmount: rental.paidAmount || 0,
        category: 'Vehicle Rental Income',
        departmentName: 'Vehicle Rental / Fleet',
        paymentStatus: (rental.paymentStatus === 'paid' ? 'paid' : (rental.paymentStatus === 'partially_paid' ? 'partially_paid' : 'unpaid')) as any,
        paymentMethod: rental.paymentMethod,
        paymentReference: paymentRef,
        orderNumber: rental.rentalAgreementNumber || undefined,
        updatedAt: new Date()
      };

      for (const d of snapshot.docs) {
        await updateDoc(doc(db, 'transactions', d.id), updates).catch(() => {});
        await updateDoc(doc(db, 'finance_ledger', d.id), updates).catch(() => {});
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('financeRecordUpdated', {
            detail: {
              entityId: rental.id,
              referenceId: rental.id,
              ...updates,
              action: 'UPDATE_RENTAL_TRANSACTION',
              timestamp: Date.now(),
            },
          })
        );
      }
    } else if (rental.paidAmount && rental.paidAmount > 0) {
      await createRentalTransaction(rental);
    }
  } catch (error) {
    console.error('Error updating rental transaction:', error);
    throw error;
  }
};
