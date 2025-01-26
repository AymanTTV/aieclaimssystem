import React, { useState } from 'react';
import { Rental, Vehicle } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import { calculateOverdueCost } from '../../utils/rentalCalculations';
import { isAfter } from 'date-fns';
import toast from 'react-hot-toast';
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
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amountToPay: '0',
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  // Calculate current costs
  const now = new Date();
  const overdueCost = rental.status === 'active' && isAfter(now, rental.endDate) 
    ? calculateOverdueCost(rental, now, vehicle)
    : 0;
  const totalCost = rental.cost + overdueCost;
  const remainingAmount = totalCost - rental.paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const paymentAmount = parseFloat(formData.amountToPay);
    if (isNaN(paymentAmount) || paymentAmount <= 0 || paymentAmount > remainingAmount) {
      toast.error('Invalid payment amount');
      return;
    }

    setLoading(true);

    try {
      // Create payment record
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

      // Calculate new totals
      const newPaidAmount = rental.paidAmount + paymentAmount;
      const newRemainingAmount = totalCost - newPaidAmount;
      const newPaymentStatus = newRemainingAmount <= 0 ? 'paid' : 'partially_paid';

      // Update rental record
      await updateDoc(doc(db, 'rentals', rental.id), {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
        payments: [...(rental.payments || []), payment],
        updatedAt: new Date()
      });

      // Create finance transaction
      await createFinanceTransaction({
        type: 'income',
        category: 'rental',
        amount: paymentAmount,
        description: `Rental payment for ${rental.type} rental`,
        referenceId: rental.id,
        vehicleId: rental.vehicleId,
        vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : undefined,
        paymentMethod: formData.method,
        paymentReference: formData.reference || undefined,
        paymentStatus: newPaymentStatus
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
        <div className="flex justify-between text-sm">
          <span>Base Cost:</span>
          <span className="font-medium">£{rental.cost.toFixed(2)}</span>
        </div>
        
        {overdueCost > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Overdue Charges:</span>
            <span>+£{overdueCost.toFixed(2)}</span>
          </div>
        )}
        
        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>Total Cost:</span>
          <span>£{totalCost.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span>Amount Paid:</span>
          <span className="text-green-600">£{rental.paidAmount.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span>Remaining Amount:</span>
          <span className="text-amber-600">£{remainingAmount.toFixed(2)}</span>
        </div>
      </div>

      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amountToPay}
        onChange={(e) => setFormData({ ...formData, amountToPay: e.target.value })}
        required
        min="0.01"
        max={remainingAmount}
        step="0.01"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select
          value={formData.method}
          onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
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
        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
        placeholder="Enter payment reference or transaction ID"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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