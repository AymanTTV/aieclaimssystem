import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FinanceTransactionParams {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  referenceId: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleOwner?: {
    name: string;
    isDefault: boolean;
  };
  status?: 'pending' | 'completed';
  paymentMethod?: string;
  paymentReference?: string;
  paymentStatus?: 'paid' | 'unpaid' | 'partially_paid';
}

export const createFinanceTransaction = async ({
  type,
  category,
  amount,
  description,
  referenceId,
  vehicleId,
  vehicleName,
  vehicleOwner,
  status = 'completed',
  paymentMethod,
  paymentReference,
  paymentStatus = 'paid'
}: FinanceTransactionParams) => {
  try {
    // Validate required fields
    if (!amount || !category || !description || !referenceId) {
      throw new Error('Missing required fields for finance transaction');
    }

    const transaction = {
      type,
      category,
      amount,
      description,
      referenceId,
      ...(vehicleId && { vehicleId }),
      ...(vehicleName && { vehicleName }),
      ...(vehicleOwner && { vehicleOwner }),
      ...(paymentMethod && { paymentMethod }),
      ...(paymentReference && { paymentReference }),
      status,
      paymentStatus,
      date: new Date(),
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'transactions'), transaction);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating finance transaction:', error);
    throw error;
  }
};