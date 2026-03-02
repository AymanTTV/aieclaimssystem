// src/components/rentals/RentalPaymentModal.tsx
import React, { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, RentalPayment, Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import { calculateOverdueCost, calculateRentalCost } from '../../utils/rentalCalculations'; 
import { isAfter } from 'date-fns';
import { useCustomers } from '../../hooks/useCustomers';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

import { Pencil, Trash2 } from 'lucide-react';

import { deleteRentalPayment, updateRentalPayment } from '../../utils/paymentUtils';

interface RentalPaymentModalProps {
  rental: Rental;
  vehicle?: Vehicle;
  onClose: () => void;
}

const RentalPaymentModal: React.FC<RentalPaymentModalProps> = ({
  rental,
  vehicle,
  onClose
}) => {
  const { user } = useAuth();
  const { formatCurrency } = useFormattedDisplay();
  const [loading, setLoading] = useState(false);

  // Editing state
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const editingPayment = useMemo(
    () => rental.payments?.find(p => p.id === editingPaymentId) || null,
    [editingPaymentId, rental.payments]
  );

  const [formData, setFormData] = useState({
    amountToPay: '0',
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  const { customers } = useCustomers();
  const paymentCustomer = customers.find(c => c.id === rental.customerId);

  // --- 1. Dynamic Cost Re-calculation (Matches Table Logic Exactly) ---
  const calculatedBaseCostWithExtras = useMemo(() => {
    if (!vehicle) return rental.cost || 0;

    const startDateTime = (rental as any)?.startDate?.toDate 
      ? (rental as any).startDate.toDate() 
      : new Date(rental.startDate);
      
    const endDateTime = (rental as any)?.endDate?.toDate 
      ? (rental as any).endDate.toDate() 
      : new Date(rental.endDate);

    const calculatedCost = calculateRentalCost(
      startDateTime,
      endDateTime,
      rental.type,
      vehicle,
      rental.reason,
      rental.negotiatedRate ?? undefined,
      
      rental.storageCost || 0,
      rental.recoveryCost || 0,
      // Pass stored gross totals
      rental.deliveryCharge || 0,
      rental.collectionCharge || 0,
      
      rental.insurancePerDay || 0,
      (rental as any).insurancePerWeek || 0,

      rental.includeVAT,
      // ✅ FIX: Pass FALSE for Delivery/Collection VAT flags (Same as RentalTable)
      // because stored delivery/collection charges are often already Gross totals.
      false, 
      false, 
      
      rental.insurancePerDayIncludeVAT,
      (rental as any).insurancePerWeekIncludeVAT,
      rental.includeRecoveryCostVAT
    );

    const discountAmount = (rental.discountAmount || 0);
    
    return Math.max(0, calculatedCost - discountAmount);
  }, [rental, vehicle]);

  // --- 2. Calculate Ongoing & Return Charges ---
  const now = new Date();
  const ongoingCharges =
    rental.status === 'active' && isAfter(now, rental.endDate)
      ? calculateOverdueCost(rental, now, vehicle)
      : 0;

  const mainReturnCharges = rental.returnCondition?.totalCharges || 0;
  const subCharges = (rental.hireSubstitutionDetails || []).reduce((acc, sub) => acc + (sub.returnCondition?.totalCharges || 0), 0);
  
  const totalReturnCharges = mainReturnCharges + subCharges;

  // --- 3. Final Totals ---
  const totalAmountDue = calculatedBaseCostWithExtras + ongoingCharges + totalReturnCharges;

  const paid = rental.paidAmount || 0;
  const remainingAmount = totalAmountDue - paid;

  // Prefill form when selecting an edit
  const prefillFromPayment = (p: RentalPayment) => {
    setFormData({
      amountToPay: p.amount.toString(),
      method: p.method as any,
      reference: p.reference || '',
      notes: p.notes || ''
    });
  };

  const resetForm = () => {
    setEditingPaymentId(null);
    setFormData({
      amountToPay: '0',
      method: 'cash',
      reference: '',
      notes: ''
    });
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Delete this payment?')) return;
    try {
      setLoading(true);
      await deleteRentalPayment(rental, paymentId, vehicle);
      toast.success('Payment deleted');
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to delete payment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('User not authenticated.');
      return;
    }

    const paymentAmount = parseFloat(formData.amountToPay);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Enter a valid payment amount.');
      return;
    }

    // Cap check logic
    const originalAmt = editingPayment?.amount ?? 0;
    const effectiveMax = editingPaymentId
      ? remainingAmount + originalAmt
      : remainingAmount;

    // Allow small floating point margin
    if (paymentAmount > effectiveMax + 0.05) {
      toast.error(
        `Invalid payment amount. Maximum allowed is ${formatCurrency(effectiveMax)}`
      );
      return;
    }

    setLoading(true);

    try {
      if (editingPaymentId) {
        await updateRentalPayment(
          rental,
          editingPaymentId,
          {
            amount: paymentAmount,
            method: formData.method,
            reference: formData.reference || null,
            notes: formData.notes || null
          },
          vehicle
        );
        toast.success('Payment updated');
        onClose();
        return;
      }

      const payment: RentalPayment = {
        id: Date.now().toString(),
        date: new Date(),
        amount: paymentAmount,
        method: formData.method,
        reference: formData.reference || null,
        notes: formData.notes || null,
        createdAt: new Date(),
        createdBy: user.id
      };

      const newPaidAmount = paid + paymentAmount;
      const newRemainingAmount = totalAmountDue - newPaidAmount;
      const newPaymentStatus =
        newRemainingAmount <= 0.001 ? 'paid' : 'partially_paid';

      // Update Firebase with fresh calc to align DB state
      await updateDoc(doc(db, 'rentals', rental.id), {
        paidAmount: newPaidAmount,
        remainingAmount: Math.max(newRemainingAmount, 0),
        paymentStatus: newPaymentStatus,
        payments: [...(rental.payments || []), payment],
        updatedAt: new Date()
      });

      const vehicleOwner = vehicle?.owner
        ? {
            name: vehicle.owner.name,
            isDefault: vehicle.owner.isDefault ?? false
          }
        : undefined;

      await createFinanceTransaction({
        type: 'income',
        category: 'Rental',
        amount: paymentAmount,
        description:
          `A ${rental.type} rental payment from customer (${paymentCustomer?.name || 'N/A'})` +
          (formData.notes ? ` – ${formData.notes}` : ''),
        referenceId: rental.id,
        vehicleId: rental.vehicleId,
        vehicleName: vehicle
          ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
          : undefined,
        vehicleOwner,
        customerId: rental.customerId,
        customerName: paymentCustomer?.name,
        paymentMethod: formData.method,
        paymentReference: formData.reference || undefined,
        status: 'completed',
        paymentStatus: newPaymentStatus,
        date: new Date(),
        accountTo: vehicle?.owner?.accountId || undefined 
      });

      toast.success('Payment recorded successfully');
      onClose();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Existing Payments */}
      {user?.role === 'manager' && rental.payments && rental.payments.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Previous Payments</h3>
          <div className="space-y-2 max-h-56 overflow-auto pr-1">
            {rental.payments.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between bg-gray-50 p-3 rounded-md"
              >
                <div>
                  <div className="font-medium">£{p.amount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {p.method.replace('_', ' ')}
                  </div>
                  {p.reference && (
                    <div className="text-xs text-gray-500">Ref: {p.reference}</div>
                  )}
                  <div className="text-xs text-gray-500">
                    {new Date(
                      (p.date as any)?.toDate ? (p.date as any).toDate() : new Date(p.date)
                    ).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPaymentId(p.id);
                      prefillFromPayment(p);
                    }}
                    className="inline-flex items-center px-2 py-1 text-xs border rounded hover:bg-gray-100"
                    title="Edit payment"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="inline-flex items-center px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50"
                    title="Delete payment"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingPaymentId && (
            <div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              <div>
                Editing payment{' '}
                <span className="font-medium">#{editingPaymentId.slice(-6)}</span>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="underline hover:opacity-80"
              >
                Cancel edit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cost Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Calculated Rental Cost:</span>
          <span className="font-medium">{formatCurrency(calculatedBaseCostWithExtras)}</span>
        </div>

        {rental.discountAmount ? (
          <div className="text-xs text-gray-500 -mt-1 text-right">
            (Includes {formatCurrency(rental.discountAmount)} discount)
          </div>
        ) : null}

        {ongoingCharges > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Ongoing Charges:</span>
            <span>+{formatCurrency(ongoingCharges)}</span>
          </div>
        )}

        {totalReturnCharges > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Return Charges{subCharges > 0 ? ' (Inc. Subs)' : ''}:</span>
            <span>+{formatCurrency(totalReturnCharges)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>Total Amount Due:</span>
          <span>{formatCurrency(totalAmountDue)}</span>
        </div>

        <div className="flex justify-between text-sm text-green-600">
          <span>Amount Paid:</span>
          <span>{formatCurrency(paid)}</span>
        </div>

        <div className="flex justify-between text-sm text-amber-600 pt-2 border-t">
          <span>Remaining Amount:</span>
          <span>{formatCurrency(remainingAmount)}</span>
        </div>
      </div>

      {/* Payment Form Fields */}
      <FormField
        type="number"
        label={editingPaymentId ? 'New Amount' : 'Amount to Pay'}
        value={formData.amountToPay}
        onChange={e => setFormData({ ...formData, amountToPay: e.target.value })}
        required
        min="0.01"
        step="0.01"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select
          value={formData.method}
          onChange={e => setFormData({ ...formData, method: e.target.value as any })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>

      <FormField
        label="Payment Reference"
        value={formData.reference}
        onChange={e => setFormData({ ...formData, reference: e.target.value })}
        placeholder="Enter payment reference or transaction ID"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Add any notes about this payment"
        />
      </div>

      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Close
        </button>

        <div className="flex gap-2">
          {editingPaymentId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel Edit
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
          >
            {loading ? 'Processing...' : editingPaymentId ? 'Update Payment' : 'Record Payment'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default RentalPaymentModal;