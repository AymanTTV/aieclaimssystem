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
  s: 'paid' | 'partially_paid' | 'pending'
): 'paid' | 'partially_paid' | 'unpaid' => (s === 'pending' ? 'unpaid' : s);

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
 * Preferred match:
 *   - referenceId == rental.id
 *   - paymentReference == oldPayment.id
 * Legacy fallback:
 *   - referenceId == rental.id
 *   - paymentReference == oldPayment.reference
 *
 * If not found, create an "adjustment" transaction for the delta (with customer info).
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

  // Preferred: paymentReference == old payment id
  let q = query(
    txRef,
    where('referenceId', '==', rental.id),
    where('paymentReference', '==', oldPayment.id)
  );
  let snap = await getDocs(q);

  // Legacy: paymentReference == oldPayment.reference
  if (snap.empty && oldPayment.reference) {
    q = query(
      txRef,
      where('referenceId', '==', rental.id),
      where('paymentReference', '==', oldPayment.reference)
    );
    snap = await getDocs(q);
  }

  const delta = (newPayment.amount || 0) - (oldPayment.amount || 0);

  // If found, update in place (also ensure customer fields are present)
  if (!snap.empty) {
    const customerName = await resolveCustomerName(rental.customerId);
    await Promise.all(
      snap.docs.map(async (d) => {
        const ref = d.ref;
        await updateDoc(ref, {
          amount: newPayment.amount,
          paymentMethod: newPayment.method,
          paymentReference: newPayment.id, // normalize linkage going forward
          paymentStatus: toFinanceStatus(paymentStatus),
          description: `Edited rental payment (#${rental.id.slice(-8).toUpperCase()})`,
          updatedAt: new Date(),
          customerId: rental.customerId || null,
          ...(customerName ? { customerName } : {}),
        });
      })
    );
    return;
  }

  // If not found, create an adjustment for the delta (only if non-zero)
  if (Math.abs(delta) > 0.0001) {
    const customerName = await resolveCustomerName(rental.customerId);
    await createFinanceTransaction({
      type: delta >= 0 ? 'income' : 'expense',
      category: 'payment_adjustment',
      amount: Math.abs(delta),
      description: `Payment edit for rental #${rental.id.slice(-8).toUpperCase()}`,
      referenceId: rental.id,
      vehicleId: rental.vehicleId,
      vehicleName: vehicle
        ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
        : undefined,
      paymentMethod: newPayment.method,
      paymentReference: newPayment.id, // store payment id for reliable future lookups
      paymentStatus: toFinanceStatus(paymentStatus),
      date: new Date(),
      // ✅ include customer info
      customerId: rental.customerId,
      customerName,
    });
  }
};

/**
 * Delete a rental payment and recompute paid/remaining/status.
 * Also logs a finance "payment_reversal" expense equal to the removed amount (with customer info).
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

    // Finance: reversal (expense) — include customer like normal rental income
    const customerName = await resolveCustomerName(rental.customerId);
    await createFinanceTransaction({
      type: 'expense',
      category: 'payment_reversal',
      amount: payment.amount,
      description: `Payment reversal for rental #${rental.id.slice(-8).toUpperCase()}`,
      referenceId: rental.id,
      vehicleId: rental.vehicleId,
      vehicleName: vehicle
        ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
        : undefined,
      paymentMethod: payment.method,
      paymentReference: payment.id, // use payment id for reliable linkage
      paymentStatus: toFinanceStatus(newPaymentStatus),
      date: new Date(),
      customerId: rental.customerId,
      customerName,
    });

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
