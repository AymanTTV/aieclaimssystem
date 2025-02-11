// src/components/driverPay/DriverPayPaymentModal.tsx

import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DriverPay } from '../../types/driverPay';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface DriverPayPaymentModalProps {
  record: DriverPay;
  onClose: () => void;
}

const DriverPayPaymentModal: React.FC<DriverPayPaymentModalProps> = ({
  record,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: record.remainingAmount.toString(),
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const paymentAmount = parseFloat(formData.amount);
    if (paymentAmount <= 0 || paymentAmount > record.remainingAmount) {
      toast.error('Invalid payment amount');
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
        createdBy: user.id,
        createdAt: new Date()
      };

      const newPaidAmount = record.paidAmount + paymentAmount;
      const newRemainingAmount = record.netPay - newPaidAmount;
      const newStatus = newRemainingAmount <= 0 ? 'paid' : 'partially_paid';

      await updateDoc(doc(db, 'driverPay', record.id), {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        payments: [...(record.payments || []), payment],
        updatedAt: new Date()
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
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between text-sm">
          <span>Net Pay:</span>
          <span className="font-medium">£{record.netPay.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Amount Paid:</span>
          <span className="text-green-600">£{record.paidAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Remaining Amount:</span>
          <span className="text-amber-600">£{record.remainingAmount.toFixed(2)}</span>
        </div>
      </div>

      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        required
        min="0.01"
        max={record.remainingAmount}
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

      <TextArea
        label="Notes"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Add any notes about this payment"
      />

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

export default DriverPayPaymentModal;
