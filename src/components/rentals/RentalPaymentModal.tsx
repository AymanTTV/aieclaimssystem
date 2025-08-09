// src/components/rentals/RentalPaymentModal.tsx
import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import { calculateOverdueCost } from '../../utils/rentalCalculations';
import { isAfter } from 'date-fns';
import { useCustomers } from '../../hooks/useCustomers';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

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
  const [formData, setFormData] = useState({
    amountToPay: '0',
    method: 'cash' as const,
    reference: '',
    notes: ''
  });
  const { customers } = useCustomers();
  const paymentCustomer = customers.find(c => c.id === rental.customerId);

  // Calculate current costs
  const now = new Date();
  const ongoingCharges = rental.status === 'active' && isAfter(now, rental.endDate)
    ? calculateOverdueCost(rental, now, vehicle)
    : 0;

  // Return condition charges
  const returnCharges = rental.returnCondition?.totalCharges || 0;

  // rental.cost is the final amount due after all calculations including VAT and discount.
  const appliedDiscount = rental.discountAmount || 0;

  // Total amount due for this rental: base cost + ongoing + return charges
  const totalAmountDue = (rental.cost || 0) + ongoingCharges + returnCharges;
  const paid = rental.paidAmount || 0;
  const remainingAmount = totalAmountDue - paid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('User not authenticated.');
      return;
    }

    const paymentAmount = parseFloat(formData.amountToPay);
    if (isNaN(paymentAmount) || paymentAmount <= 0 || paymentAmount > remainingAmount) {
      toast.error(
        `Invalid payment amount. Amount must be between £0.01 and ${formatCurrency(remainingAmount)}`
      );
      return;
    }

    setLoading(true);

    try {
      const payment = {
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
      const newPaymentStatus = newRemainingAmount <= 0.001 ? 'paid' : 'partially_paid';

      await updateDoc(doc(db, 'rentals', rental.id), {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
        payments: [...(rental.payments || []), payment],
        updatedAt: new Date()
      });

      const vehicleOwner = vehicle?.owner
        ? {
            name: vehicle.owner.name,
            isDefault: vehicle.owner.isDefault ?? false,
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
        vehicleName: `${vehicle!.make} ${vehicle!.model} (${vehicle!.registrationNumber})`,
        vehicleOwner,
        customerId: rental.customerId,
        customerName: paymentCustomer?.name,
        paymentMethod: formData.method,
        paymentReference: formData.reference || undefined,
        status: 'completed',
        paymentStatus: newPaymentStatus,
        date: new Date(),
      });

      toast.success('Payment recorded successfully');
      onClose();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Cost Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span>Total Amount Due:</span>
          <span>{formatCurrency(totalAmountDue)}</span>
        </div>

        {ongoingCharges > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Ongoing Charges:</span>
            <span>+{formatCurrency(ongoingCharges)}</span>
          </div>
        )}

        {returnCharges > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Return Charges:</span>
            <span>+{formatCurrency(returnCharges)}</span>
          </div>
        )}

        {appliedDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>
              Discount ({rental.discountPercentage ? `${rental.discountPercentage}%` : 'Applied'}):
            </span>
            <span>-{formatCurrency(appliedDiscount)}</span>
          </div>
        )}

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
        label="Amount to Pay"
        value={formData.amountToPay}
        onChange={e => setFormData({ ...formData, amountToPay: e.target.value })}
        required
        min="0.01"
        max={remainingAmount}
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

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Processing...' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
};

export default RentalPaymentModal;
