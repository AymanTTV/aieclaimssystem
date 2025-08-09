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

  // Prevent duplicate
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

  // Build base transaction
  const transaction: Record<string, any> = {
    type: 'expense',
    category: maintenanceLog.type,
    amount,
    description: maintenanceLog.description,
    referenceId: maintenanceLog.id,
    vehicleId: vehicle.id,
    vehicleName: `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`,
    paymentStatus: 'paid',
    date: new Date(),
    createdAt: new Date(),
    createdBy: 'system',
    // only include paymentMethod if defined
    ...(paymentMethod && { paymentMethod })
  };

  // inject owner if present
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
    customerId,
    customerName
  } = params;

  try {
    // If it's a transfer, update both accounts (not strictly reachable unless you extend the interface)
    if (type === 'transfer') {
      if (!accountFrom || !accountTo) {
        toast.error('Transfer requires both from and to accounts');
        return { success: false };
      }
      const fromRef = doc(db, 'accounts', accountFrom);
      const toRef = doc(db, 'accounts', accountTo);
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
      // For income/expense, update single account if provided
      if (accountFrom) {
        const fromRef = doc(db, 'accounts', accountFrom);
        const fromSnap = await getDoc(fromRef);
        if (fromSnap.exists()) {
          const fromData = fromSnap.data();
          await updateDoc(fromRef, {
            balance: type === 'income' ? fromData.balance + amount : fromData.balance - amount,
            updatedAt: new Date()
          });
        }
      }
      if (accountTo) {
        const toRef = doc(db, 'accounts', accountTo);
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

    // Build transaction object, only including defined fields
    const transaction: Record<string, any> = {
      type,
      category,
      amount,
      description,
      referenceId,
      status,
      date: date || new Date(),
      createdAt: new Date(),
      ...(vehicleId        && { vehicleId }),
      ...(vehicleName      && { vehicleName }),
      ...(vehicleOwner     && { vehicleOwner }),
      ...(paymentMethod    && { paymentMethod }),
      ...(paymentReference && { paymentReference }),
      ...(paymentStatus    && { paymentStatus }),
      ...(accountFrom      && { accountFrom }),
      ...(accountTo        && { accountTo }),
      ...(customerId       && { customerId }),
      ...(customerName     && { customerName })
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
