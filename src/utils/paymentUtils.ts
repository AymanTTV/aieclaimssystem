// src/utils/paymentUtils.ts

import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isAfter } from 'date-fns';
import { calculateOverdueCost } from './rentalCalculations';
import { createFinanceTransaction } from './financeTransactions';
import type { Rental, RentalPayment, Vehicle } from '../types';

/**
 * Compute the same "Total Amount Due" used in the UI:
 * rental.cost (VAT/discount included) + overdue/ongoing + return charges.
 */
const computeTotalAmountDue = (rental: Rental, vehicle?: Vehicle) => {
  const now = new Date();

  const end = (rental as any)?.endDate?.toDate
    ? (rental as any).endDate.toDate()
    : new Date(rental.endDate as any);

  const ongoingCharges =
    rental.status === 'active' &&
    end instanceof Date &&
    !Number.isNaN(end.getTime()) &&
    isAfter(now, end) &&
    vehicle
      ? calculateOverdueCost(rental, now, vehicle)
      : 0;

  const returnCharges = rental.returnCondition?.totalCharges || 0;

  return (rental.cost || 0) + ongoingCharges + returnCharges;
};

/**
 * Map rental-level payment status to finance transaction status type.
 * financeTransactions.ts expects: 'paid' | 'partially_paid' | 'unpaid'
 */
const toFinanceStatus = (
  s: 'paid' | 'partially_paid' | 'pending' | 'refunded' | 'unpaid' | string
): 'paid' | 'partially_paid' | 'unpaid' => {
  if (s === 'pending' || s === 'refunded') return 'unpaid';
  return s as any;
};

/**
 * Resolve customer name from Firestore for a given customerId.
 */
const resolveCustomerName = async (customerId?: string): Promise<string | undefined> => {
  if (!customerId) return undefined;
  try {
    const snap = await getDoc(doc(db, 'customers', customerId));
    if (snap.exists()) {
      const data = snap.data() as { name?: string };
      return data?.name || undefined;
    }
  } catch {
    // ignore and fall back to undefined
  }
  return undefined;
};

/**
 * Try to update the finance transaction that corresponds to a specific payment.
 * Comprehensive match:
 *   - paymentId == oldPayment.id
 *   - referenceId == rental.id AND paymentReference == oldPayment.id
 *   - referenceId == rental.id AND paymentReference == oldPayment.reference
 */
const upsertFinanceTxForPaymentEdit = async (opts: {
  rental: Rental;
  oldPayment: RentalPayment;
  newPayment: RentalPayment;
  vehicle?: Vehicle;
  paymentStatus: 'paid' | 'partially_paid' | 'pending';
}) => {
  const { rental, oldPayment, newPayment, vehicle, paymentStatus } = opts;

  const txRef = collection(db, 'transactions');
  const matchedDocs: any[] = [];

  // 1. Query by paymentId
  try {
    const qPayId = query(txRef, where('paymentId', '==', oldPayment.id));
    const snapPayId = await getDocs(qPayId);
    snapPayId.docs.forEach((d) => matchedDocs.push(d));
  } catch {}

  // 2. Query by paymentReference == oldPayment.id
  if (matchedDocs.length === 0) {
    try {
      const qPayRef = query(
        txRef,
        where('referenceId', '==', rental.id),
        where('paymentReference', '==', oldPayment.id)
      );
      const snapPayRef = await getDocs(qPayRef);
      snapPayRef.docs.forEach((d) => matchedDocs.push(d));
    } catch {}
  }

  // 3. Query by legacy paymentReference == oldPayment.reference
  if (matchedDocs.length === 0 && oldPayment.reference) {
    try {
      const qLegRef = query(
        txRef,
        where('referenceId', '==', rental.id),
        where('paymentReference', '==', oldPayment.reference)
      );
      const snapLegRef = await getDocs(qLegRef);
      snapLegRef.docs.forEach((d) => matchedDocs.push(d));
    } catch {}
  }

  const delta = (newPayment.amount || 0) - (oldPayment.amount || 0);
  const paymentRefStr = rental.rentalAgreementNumber || newPayment.reference || (rental.id ? `RA-${rental.id.slice(-6).toUpperCase()}` : '');
  const vehicleReg = vehicle?.registrationNumber || '';
  const targetAccountId = vehicle?.owner?.accountId || undefined;

  // If found, update in place in BOTH transactions and finance_ledger
  if (matchedDocs.length > 0) {
    const customerName = await resolveCustomerName(rental.customerId);
    const updatePayload = {
      amount: newPayment.amount,
      customerBilled: newPayment.amount,
      grossBilling: newPayment.amount,
      paid: newPayment.amount,
      paidAmount: newPayment.amount,
      paymentMethod: newPayment.method,
      paymentReference: paymentRefStr,
      paymentId: newPayment.id,
      category: 'Vehicle Rental Income',
      departmentName: 'Vehicle Rental / Fleet',
      paymentStatus: toFinanceStatus(paymentStatus),
      description: `Edited rental payment for #${paymentRefStr}${vehicleReg ? ` (${vehicleReg})` : ''}`,
      vehicleRegistration: vehicleReg || undefined,
      vehicleReg: vehicleReg || undefined,
      accountTo: targetAccountId,
      accountId: targetAccountId,
      updatedAt: new Date(),
      customerId: rental.customerId || null,
      ...(customerName ? { customerName } : {}),
    };

    for (const d of matchedDocs) {
      await updateDoc(doc(db, 'transactions', d.id), updatePayload).catch(() => {});
      await updateDoc(doc(db, 'finance_ledger', d.id), updatePayload).catch(() => {});
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            id: matchedDocs[0].id,
            paymentId: newPayment.id,
            entityId: rental.id,
            referenceId: rental.id,
            ...updatePayload,
            action: 'UPDATE_PAYMENT',
            timestamp: Date.now(),
          },
        })
      );
    }
    return;
  }

  // If not found, create an adjustment for the delta (only if non-zero)
  if (Math.abs(delta) > 0.0001) {
    const customerName = await resolveCustomerName(rental.customerId);
    await createFinanceTransaction({
      type: delta >= 0 ? 'income' : 'expense',
      transactionType: delta >= 0 ? 'INCOME' : 'EXPENSE',
      entryType: delta >= 0 ? 'CREDIT' : 'DEBIT',
      category: 'Vehicle Rental Income',
      departmentName: 'Vehicle Rental / Fleet',
      amount: Math.abs(delta),
      customerBilled: Math.abs(delta),
      description: `Payment edit for rental #${paymentRefStr}`,
      referenceId: rental.id,
      vehicleId: rental.vehicleId,
      vehicleName: vehicle
        ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
        : undefined,
      vehicleOwner: vehicle?.owner ? { name: vehicle.owner.name, isDefault: vehicle.owner.isDefault ?? false } : undefined,
      paymentMethod: newPayment.method,
      paymentReference: paymentRefStr,
      paymentId: newPayment.id,
      paymentStatus: toFinanceStatus(paymentStatus),
      date: new Date(),
      accountTo: targetAccountId,
      customerId: rental.customerId,
      customerName,
    });
  }
};

/**
 * Propagate rental payment status change directly to all linked Finance Ledger entries.
 */
export const syncRentalPaymentStatusToFinance = async (
  rentalId: string,
  newPaymentStatus: string,
  rentalAgreementNumber?: string
) => {
  try {
    const normStatus = toFinanceStatus(newPaymentStatus);
    const txRef = collection(db, 'transactions');
    const matchedDocs = new Set<string>();

    const q1 = query(txRef, where('referenceId', '==', rentalId));
    const s1 = await getDocs(q1);
    s1.docs.forEach((d) => matchedDocs.add(d.id));

    const q2 = query(txRef, where('entityId', '==', rentalId));
    const s2 = await getDocs(q2);
    s2.docs.forEach((d) => matchedDocs.add(d.id));

    for (const docId of matchedDocs) {
      const updates = {
        paymentStatus: normStatus,
        category: 'Vehicle Rental Income',
        departmentName: 'Vehicle Rental / Fleet',
        ...(rentalAgreementNumber ? { orderNumber: rentalAgreementNumber } : {}),
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, 'transactions', docId), updates).catch(() => {});
      await updateDoc(doc(db, 'finance_ledger', docId), updates).catch(() => {});
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            entityId: rentalId,
            referenceId: rentalId,
            paymentStatus: normStatus,
            action: 'UPDATE_PAYMENT_STATUS',
            timestamp: Date.now(),
          },
        })
      );
    }
  } catch (err) {
    console.warn('Error syncing rental payment status to finance:', err);
  }
};

/**
 * Refund a rental payment and propagate status directly to linked Finance Ledger entry.
 */
export const refundRentalPayment = async (
  rental: Rental,
  paymentId: string,
  refundReason?: string,
  vehicle?: Vehicle
): Promise<boolean> => {
  try {
    const payment = (rental.payments || []).find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment not found');

    const totalAmountDue = computeTotalAmountDue(rental, vehicle);
    const newPaidAmount = Math.max(0, (rental.paidAmount || 0) - (payment.amount || 0));
    const newRemainingAmount = totalAmountDue - newPaidAmount;

    const newPaymentStatus: 'pending' | 'partially_paid' | 'paid' =
      newPaidAmount <= 0
        ? 'pending'
        : Math.abs(newPaidAmount - totalAmountDue) <= 0.001
        ? 'paid'
        : 'partially_paid';

    // Mark the payment as refunded in the rental document
    const updatedPayments = (rental.payments || []).map((p) =>
      p.id === paymentId
        ? {
            ...p,
            status: 'refunded' as const,
            notes: `${p.notes ? `${p.notes} | ` : ''}REFUNDED: ${refundReason || 'Refund processed'}`,
          }
        : p
    );

    await updateDoc(doc(db, 'rentals', rental.id), {
      paidAmount: newPaidAmount,
      remainingAmount: Math.max(newRemainingAmount, 0),
      paymentStatus: newPaymentStatus,
      payments: updatedPayments,
      updatedAt: new Date(),
    });

    // Directly find and update the linked Finance Ledger entry to 'refunded' / 'cancelled'
    const txRef = collection(db, 'transactions');
    const matchedDocIds = new Set<string>();

    const qPay = query(txRef, where('paymentId', '==', paymentId));
    const sPay = await getDocs(qPay);
    sPay.docs.forEach((d) => matchedDocIds.add(d.id));

    const qRef = query(txRef, where('referenceId', '==', rental.id), where('paymentReference', '==', paymentId));
    const sRef = await getDocs(qRef);
    sRef.docs.forEach((d) => matchedDocIds.add(d.id));

    const refundDesc = `Refunded payment for rental #${rental.rentalAgreementNumber || rental.id.slice(-8).toUpperCase()}${refundReason ? ` (${refundReason})` : ''}`;

    for (const docId of matchedDocIds) {
      const updates = {
        paymentStatus: 'refunded',
        status: 'cancelled',
        description: refundDesc,
        category: 'Vehicle Rental Income',
        departmentName: 'Vehicle Rental / Fleet',
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, 'transactions', docId), updates).catch(() => {});
      await updateDoc(doc(db, 'finance_ledger', docId), updates).catch(() => {});
    }

    // Also record a payment reversal/refund expense in Finance
    const customerName = await resolveCustomerName(rental.customerId);
    await createFinanceTransaction({
      type: 'expense',
      transactionType: 'EXPENSE',
      entryType: 'DEBIT',
      category: 'Vehicle Rental Income',
      departmentName: 'Vehicle Rental / Fleet',
      amount: payment.amount,
      customerBilled: payment.amount,
      description: refundDesc,
      referenceId: rental.id,
      vehicleId: rental.vehicleId,
      vehicleName: vehicle
        ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
        : undefined,
      vehicleOwner: vehicle?.owner ? { name: vehicle.owner.name, isDefault: vehicle.owner.isDefault ?? false } : undefined,
      paymentMethod: payment.method,
      paymentReference: rental.rentalAgreementNumber || payment.reference || payment.id,
      paymentId: `refund_${payment.id}`,
      paymentStatus: 'refunded',
      status: 'completed',
      date: new Date(),
      accountFrom: vehicle?.owner?.accountId,
      customerId: rental.customerId,
      customerName,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            entityId: rental.id,
            paymentId,
            paymentStatus: 'refunded',
            action: 'REFUND_PAYMENT',
            timestamp: Date.now(),
          },
        })
      );
    }

    return true;
  } catch (error) {
    console.error('Error refunding payment:', error);
    throw error;
  }
};

/**
 * Delete a rental payment and recompute paid/remaining/status.
 * Also propagates status change to the linked Finance Ledger entry and logs a reversal.
 */
export const deleteRentalPayment = async (
  rental: Rental,
  paymentId: string,
  vehicle?: Vehicle
): Promise<boolean> => {
  try {
    const payment = (rental.payments || []).find((p) => p.id === paymentId);
    if (!payment) throw new Error('Payment not found');

    const totalAmountDue = computeTotalAmountDue(rental, vehicle);

    const newPaidAmount = (rental.paidAmount || 0) - (payment.amount || 0);
    const newRemainingAmount = totalAmountDue - newPaidAmount;

    const newPaymentStatus: 'pending' | 'partially_paid' | 'paid' =
      newPaidAmount <= 0
        ? 'pending'
        : Math.abs(newPaidAmount - totalAmountDue) <= 0.001
        ? 'paid'
        : 'partially_paid';

    await updateDoc(doc(db, 'rentals', rental.id), {
      paidAmount: Math.max(newPaidAmount, 0),
      remainingAmount: Math.max(newRemainingAmount, 0),
      paymentStatus: newPaymentStatus,
      payments: (rental.payments || []).filter((p) => p.id !== paymentId),
      updatedAt: new Date(),
    });

    // Propagate status change directly to any linked Finance Ledger entry
    const txRef = collection(db, 'transactions');
    const matchedDocIds = new Set<string>();

    const qPay = query(txRef, where('paymentId', '==', paymentId));
    const sPay = await getDocs(qPay);
    sPay.docs.forEach((d) => matchedDocIds.add(d.id));

    const qRef = query(txRef, where('referenceId', '==', rental.id), where('paymentReference', '==', paymentId));
    const sRef = await getDocs(qRef);
    sRef.docs.forEach((d) => matchedDocIds.add(d.id));

    for (const docId of matchedDocIds) {
      const updates = {
        paymentStatus: 'refunded',
        status: 'cancelled',
        description: `Cancelled / Reversed rental payment for #${rental.rentalAgreementNumber || rental.id.slice(-8).toUpperCase()}`,
        updatedAt: new Date(),
      };
      await updateDoc(doc(db, 'transactions', docId), updates).catch(() => {});
      await updateDoc(doc(db, 'finance_ledger', docId), updates).catch(() => {});
    }

    // Finance: reversal (expense) — include customer like normal rental income
    const customerName = await resolveCustomerName(rental.customerId);
    await createFinanceTransaction({
      type: 'expense',
      transactionType: 'EXPENSE',
      entryType: 'DEBIT',
      category: 'Vehicle Rental Income',
      departmentName: 'Vehicle Rental / Fleet',
      amount: payment.amount,
      customerBilled: payment.amount,
      description: `Payment reversal for rental #${rental.rentalAgreementNumber || rental.id.slice(-8).toUpperCase()}`,
      referenceId: rental.id,
      vehicleId: rental.vehicleId,
      vehicleName: vehicle
        ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
        : undefined,
      vehicleOwner: vehicle?.owner ? { name: vehicle.owner.name, isDefault: vehicle.owner.isDefault ?? false } : undefined,
      paymentMethod: payment.method,
      paymentReference: rental.rentalAgreementNumber || payment.id,
      paymentId: `reversal_${payment.id}`,
      paymentStatus: toFinanceStatus(newPaymentStatus),
      date: new Date(),
      accountFrom: vehicle?.owner?.accountId,
      customerId: rental.customerId,
      customerName,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('financeRecordUpdated', {
          detail: {
            entityId: rental.id,
            paymentId,
            deletedPaymentId: paymentId,
            paymentStatus: newPaymentStatus,
            action: 'DELETE_PAYMENT',
            timestamp: Date.now(),
          },
        })
      );
    }

    return true;
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

/**
 * Edit an existing payment in-place and recompute paid/remaining/status.
 * Attempts to update the original finance transaction for that payment.
 * If none is found (older data), creates an "adjustment" transaction for the delta (with customer info).
 */
export const updateRentalPayment = async (
  rental: Rental,
  paymentId: string,
  updates: Partial<
    Pick<RentalPayment, 'amount' | 'method' | 'reference' | 'notes' | 'document'>
  >,
  vehicle?: Vehicle
): Promise<boolean> => {
  try {
    const payments = rental.payments || [];
    const idx = payments.findIndex((p) => p.id === paymentId);
    if (idx === -1) throw new Error('Payment not found');

    const oldPayment = payments[idx];
    const newPayment: RentalPayment = { ...oldPayment, ...updates };

    // Rebuild payments array
    const nextPayments = [...payments];
    nextPayments[idx] = newPayment;

    // Recompute totals with delta
    const totalAmountDue = computeTotalAmountDue(rental, vehicle);
    const oldPaid = rental.paidAmount || 0;
    const delta = (newPayment.amount || 0) - (oldPayment.amount || 0);

    const newPaidAmount = oldPaid + delta;
    const newRemainingAmount = totalAmountDue - newPaidAmount;

    const newPaymentStatus: 'pending' | 'partially_paid' | 'paid' =
      newPaidAmount <= 0
        ? 'pending'
        : Math.abs(newPaidAmount - totalAmountDue) <= 0.001
        ? 'paid'
        : 'partially_paid';

    await updateDoc(doc(db, 'rentals', rental.id), {
      payments: nextPayments,
      paidAmount: Math.max(newPaidAmount, 0),
      remainingAmount: Math.max(newRemainingAmount, 0),
      paymentStatus: newPaymentStatus,
      updatedAt: new Date(),
    });

    // Keep finance in sync (and ensure customer is attached)
    await upsertFinanceTxForPaymentEdit({
      rental,
      oldPayment,
      newPayment,
      vehicle,
      paymentStatus: newPaymentStatus,
    });

    return true;
  } catch (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
};
