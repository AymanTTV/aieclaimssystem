// src/utils/financeTransactions.ts

import { addDoc, collection, doc, updateDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
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
  accountFrom?: string;
  accountTo?: string;
  customerId?: string; // NEW: Add customerId
  customerName?: string; // NEW: Add customerName
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

  // Check if a transaction already exists for this maintenance log
  const transactionsRef = collection(db, 'transactions');
  const q = query(transactionsRef, where('referenceId', '==', maintenanceLog.id), where('category', '==', 'maintenance'));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    console.warn('Transaction for this maintenance log already exists.');
    toast.error('Transaction for this maintenance log already exists.');
    return;
  }

  const transaction: Transaction = {
    type: 'expense',
    category: 'Maintenance',
    amount,
    description: `Maintenance for ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`,
    referenceId: maintenanceLog.id,
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.make} ${vehicle.model}`,
    paymentMethod,
    paymentStatus: 'paid',
    date: new Date(),
    createdAt: new Date(),
    createdBy: 'system', // Or current user's ID
  };

  if (paymentReference) {
    transaction.paymentReference = paymentReference;
  }

  try {
    await addDoc(collection(db, 'transactions'), transaction);
    toast.success('Maintenance transaction created successfully!');
  } catch (error) {
    console.error('Error creating maintenance transaction:', error);
    toast.error('Failed to create maintenance transaction');
  }
};


export const createFinanceTransaction = async (params: FinanceTransactionParams) => {
  const {
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
    paymentStatus,
    date,
    accountFrom,
    accountTo,
    customerId, // NEW
    customerName, // NEW
  } = params;

  try {
    // If it's a transfer, update account balances
    if (type === 'transfer') {
      if (!accountFrom || !accountTo) {
        toast.error('Transfer requires both from and to accounts');
        return { success: false };
      }

      const accountFromRef = doc(db, 'accounts', accountFrom);
      const accountToRef = doc(db, 'accounts', accountTo);

      const [accountFromDoc, accountToDoc] = await Promise.all([
        getDoc(accountFromRef),
        getDoc(accountToRef)
      ]);

      if (accountFromDoc.exists() && accountToDoc.exists()) {
        const accountFromData = accountFromDoc.data();
        const accountToData = accountToDoc.data();

        await updateDoc(accountFromRef, {
          balance: accountFromData.balance - amount,
          updatedAt: new Date()
        });

        await updateDoc(accountToRef, {
          balance: accountToData.balance + amount,
          updatedAt: new Date()
        });
      } else {
        toast.error('One or both accounts not found for transfer');
        return { success: false };
      }
    } else {
      // For income/expense, update single account if specified
      if (accountFrom) {
        const accountFromRef = doc(db, 'accounts', accountFrom);
        const accountFromDoc = await getDoc(accountFromRef);

        if (accountFromDoc.exists()) {
          const accountFromData = accountFromDoc.data();
          await updateDoc(accountFromRef, {
            balance: type === 'income' ? accountFromData.balance + amount : accountFromData.balance - amount,
            updatedAt: new Date()
          });
        }
      }

      if (accountTo) {
        const accountToRef = doc(db, 'accounts', accountTo);
        const accountToDoc = await getDoc(accountToRef);
        
        if (accountToDoc.exists()) {
          const accountToData = accountToDoc.data();
          await updateDoc(accountToRef, {
            balance: type === 'income' ? accountToData.balance + amount : accountToData.balance - amount,
            updatedAt: new Date()
          });
        }
      }
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
      ...(accountFrom && { accountFrom }),
      ...(accountTo && { accountTo }),
      ...(customerId && { customerId }), // NEW: Include customerId
      ...(customerName && { customerName }), // NEW: Include customerName
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
    return { success: false };
  }
};