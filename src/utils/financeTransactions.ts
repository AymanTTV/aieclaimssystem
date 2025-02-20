// src/utils/financeTransactions.ts

import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MaintenanceLog, Vehicle } from '../types';
import toast from 'react-hot-toast';

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
  date?: Date;
}

export const createMaintenanceTransaction = async (
  maintenanceLog: MaintenanceLog,
  vehicle: Vehicle,
  amount: number,
  paymentMethod: string,
  paymentReference?: string
) => {
  if (!maintenanceLog.id || !amount || !vehicle) {
    console.error('Missing required fields for maintenance transaction');
    toast.error('Missing required fields for transaction');
    return;
  }

  return createFinanceTransaction({
    type: 'expense',
    category: 'maintenance',
    amount,
    description: `Maintenance payment for ${maintenanceLog.description}`,
    referenceId: maintenanceLog.id,
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.make} ${vehicle.model}`,
    vehicleOwner: vehicle.owner || { name: 'AIE Skyline', isDefault: true },
    paymentMethod,
    paymentReference,
    paymentStatus: 'paid',
    date: new Date()
  });
};

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
  paymentStatus = 'paid',
  date = new Date()
}: FinanceTransactionParams) => {
  try {
    // Validate required fields
    if (!type || !category || !amount || !description || !referenceId) {
      console.error('Missing required fields:', { type, category, amount, description, referenceId });
      throw new Error('Missing required fields for finance transaction');
    }

    console.log('Creating finance transaction:', {
      type,
      category,
      amount,
      description,
      referenceId
    });

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
      date,
      createdAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'transactions'), transaction);
    console.log('Transaction created with ID:', docRef.id);
    
    toast.success(`${type === 'income' ? 'Income' : 'Expense'} transaction created successfully`);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating finance transaction:', error);
    toast.error('Failed to create transaction');
    throw error;
  }
};
