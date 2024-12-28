import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';

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
  status = 'completed'
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