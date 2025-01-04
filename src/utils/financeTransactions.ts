import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FinanceTransactionParams {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  referenceId: string;
  vehicleId: string;
  vehicleName?: string;
  vehicleOwner?: {
    name: string;
    isDefault: boolean;
  };
  status?: 'pending' | 'completed';
  paymentMethod?: string;
  paymentReference?: string;
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
  paymentReference
}: FinanceTransactionParams) => {
  try {
    const transaction = {
      type,
      category,
      amount,
      description,
      referenceId,
      vehicleId,
      vehicleName,
      vehicleOwner,
      status,
      paymentMethod,
      paymentReference,
      date: new Date(),
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'transactions'), transaction);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating finance transaction:', error);
    return { success: false, error };
  }
};