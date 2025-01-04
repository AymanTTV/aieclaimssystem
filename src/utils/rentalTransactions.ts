import { addDoc, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Rental } from '../types';

export const createRentalTransaction = async (rental: Rental) => {
  try {
    if (rental.paidAmount && rental.paidAmount > 0) {
      await addDoc(collection(db, 'transactions'), {
        type: 'income',
        category: 'rental',
        amount: rental.paidAmount,
        description: `Rental payment for ${rental.type} rental`,
        referenceId: rental.id,
        vehicleId: rental.vehicleId,
        paymentStatus: rental.paymentStatus,
        paymentMethod: rental.paymentMethod,
        paymentReference: rental.paymentReference,
        date: new Date(),
        createdAt: new Date()
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
      const transactionDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'transactions', transactionDoc.id), {
        amount: rental.paidAmount || 0,
        paymentStatus: rental.paymentStatus,
        paymentMethod: rental.paymentMethod,
        paymentReference: rental.paymentReference,
        updatedAt: new Date()
      });
    } else if (rental.paidAmount && rental.paidAmount > 0) {
      // Create new transaction if none exists and there's a payment
      await createRentalTransaction(rental);
    }
  } catch (error) {
    console.error('Error updating rental transaction:', error);
    throw error;
  }
};