import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface FinanceTransactionParams {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  referenceId: string;
  vehicleId: string;
  status?: 'pending' | 'completed' | 'cancelled';
}

export const createFinanceTransaction = async ({
  type,
  category,
  amount,
  description,
  referenceId,
  vehicleId,
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

export const calculateRentalIncome = (startDate: Date, endDate: Date, dailyRate: number): number => {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return days * dailyRate;
};

export const calculateClaimSettlement = (
  claimType: 'fault' | 'non-fault',
  policyExcess: number,
  totalExpenses: number
): number => {
  if (claimType === 'fault') {
    return -policyExcess; // Negative amount as it's an expense
  }
  return totalExpenses; // Full amount recovered for non-fault claims
};