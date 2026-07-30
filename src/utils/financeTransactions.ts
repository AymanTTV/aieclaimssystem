// src/utils/financeTransactions.ts

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  query,
  updateDoc,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MaintenanceLog, Vehicle } from '../types';
import toast from 'react-hot-toast';

interface FinanceTransactionParams {
  type: 'income' | 'expense';
  category: string;
  amount: number;
  netAmount?: number;
  vatAmount?: number;
  description: string;
  referenceId: string;
  vehicleId?: string;
  vehicleName?: string;
  vehicleOwner?: {
    name: string;
    isDefault: boolean;
  };
  status?: 'pending' | 'completed' | 'cancelled';
  paymentMethod?: string;
  paymentReference?: string;
  paymentStatus?: 'paid' | 'partially_paid' | 'unpaid';
  date?: Date;
  accountFrom?: string;
  accountTo?: string;
  accountsFrom?: string[]; // Array Support Added
  accountsTo?: string[];   // Array Support Added
  customerId?: string;
  customerName?: string;
}

export async function reverseFinanceTransaction(params: {
  referenceId: string;
  paymentId: string;
}) {
  const { referenceId, paymentId } = params;
  try {
    const txRef = collection(db, 'transactions');
    const q = query(
      txRef,
      where('referenceId', '==', referenceId),
      where('paymentReference', '==', paymentId)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      console.warn('No matching finance transaction to reverse');
      return;
    }
    await Promise.all(
      snap.docs.map((d) => deleteDoc(doc(db, 'transactions', d.id)))
    );
    toast.success('Finance transaction reversed');
  } catch (err) {
    console.error('Failed to reverse finance transaction', err);
    toast.error('Could not reverse finance transaction');
    throw err;
  }
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

  const transactionsRef = collection(db, 'transactions');
  const dupQuery = query(
    transactionsRef,
    where('referenceId', '==', maintenanceLog.id),
    where('category', '==', maintenanceLog.type)
  );
  const dupSnap = await getDocs(dupQuery);
  if (!dupSnap.empty) {
    console.warn('Transaction for this maintenance log already exists.');
    toast.error('Transaction for this maintenance log already exists.');
    return;
  }

  const transaction: Record<string, any> = {
    type: 'expense',
    category: maintenanceLog.type,
    amount,
    netAmount: maintenanceLog.netAmount,
    vatAmount: maintenanceLog.vatAmount,
    description: maintenanceLog.description,
    referenceId: maintenanceLog.id,
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`,
    paymentStatus: 'paid',
    date: new Date(),
    createdAt: new Date(),
    createdBy: 'system',
    ...(paymentMethod && { paymentMethod })
  };

  if (vehicle.owner) {
    transaction.vehicleOwner = {
      name: vehicle.owner.name,
      isDefault: vehicle.owner.isDefault ?? false
    };
  }

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
    netAmount,
    vatAmount,
    description,
    referenceId,
    vehicleId,
    vehicleName,
    vehicleOwner,
    status = 'completed',
    paymentMethod,
    paymentReference,
    paymentStatus,
    date,
    accountFrom,
    accountTo,
    accountsFrom,
    accountsTo,
    customerId,
    customerName
  } = params;

  try {
    const finalAccountsFrom = accountsFrom || (accountFrom ? [accountFrom] : []);
    const finalAccountsTo = accountsTo || (accountTo ? [accountTo] : []);

    if (type === ('transfer' as any)) {
      if (finalAccountsFrom.length === 0 || finalAccountsTo.length === 0) {
        toast.error('Transfer requires both from and to accounts');
        return { success: false };
      }
      const fromRef = doc(db, 'accounts', finalAccountsFrom[0]);
      const toRef = doc(db, 'accounts', finalAccountsTo[0]);
      const [fromSnap, toSnap] = await Promise.all([getDoc(fromRef), getDoc(toRef)]);
      if (fromSnap.exists() && toSnap.exists()) {
        const fromData = fromSnap.data();
        const toData = toSnap.data();
        await updateDoc(fromRef, { balance: fromData.balance - amount, updatedAt: new Date() });
        await updateDoc(toRef,   { balance: toData.balance + amount,   updatedAt: new Date() });
      } else {
        toast.error('One or both accounts not found for transfer');
        return { success: false };
      }
    } else {
      // Loop over accountsFrom and accountsTo to dynamically update all balances
      for (const fromId of finalAccountsFrom) {
        const fromRef = doc(db, 'accounts', fromId);
        const fromSnap = await getDoc(fromRef);
        if (fromSnap.exists()) {
          const fromData = fromSnap.data();
          await updateDoc(fromRef, {
            balance: type === 'income' ? fromData.balance + amount : fromData.balance - amount,
            updatedAt: new Date()
          });
        }
      }
      for (const toId of finalAccountsTo) {
        const toRef = doc(db, 'accounts', toId);
        const toSnap = await getDoc(toRef);
        if (toSnap.exists()) {
          const toData = toSnap.data();
          await updateDoc(toRef, {
            balance: type === 'income' ? toData.balance + amount : toData.balance - amount,
            updatedAt: new Date()
          });
        }
      }
    }

    const transaction: Record<string, any> = {
      type,
      category,
      amount,
      description,
      referenceId,
      status,
      date: date || new Date(),
      createdAt: new Date(),
      ...(netAmount !== undefined && { netAmount }),
      ...(vatAmount !== undefined && { vatAmount }),
      ...(vehicleId        && { vehicleId }),
      ...(vehicleName      && { vehicleName }),
      ...(vehicleOwner     && { vehicleOwner }),
      ...(paymentMethod    && { paymentMethod }),
      ...(paymentReference && { paymentReference }),
      ...(paymentStatus    && { paymentStatus }),
      accountsFrom: finalAccountsFrom, // Native Support for arrays
      accountsTo: finalAccountsTo,     // Native Support for arrays
      ...(customerId       && { customerId }),
      ...(customerName     && { customerName })
    };

    const docRef = await addDoc(collection(db, 'transactions'), transaction);
    console.log('Transaction created with ID:', docRef.id);
    // Suppress overlapping success toasts for automated records
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating finance transaction:', error);
    toast.error('Failed to create transaction');
    return { success: false };
  }
};