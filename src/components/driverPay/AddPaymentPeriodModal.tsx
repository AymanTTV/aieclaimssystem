// src/components/driverPay/AddPaymentPeriodModal.tsx

import React, { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DriverPay, PaymentPeriod, PaymentStatus } from '../../types/driverPay';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { format, differenceInDays, isAfter } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';

interface AddPaymentPeriodModalProps {
  driverPayRecord: DriverPay;
  onClose: () => void;
  onPeriodAdded: (updatedRecord: DriverPay) => void;
}

const AddPaymentPeriodModal: React.FC<AddPaymentPeriodModalProps> = ({
  driverPayRecord,
  onClose,
  onPeriodAdded,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    totalAmount: '',
    commissionPercentage: '',
    notes: '',
  });
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [netPay, setNetPay] = useState(0);

  useEffect(() => {
    const total = parseFloat(formData.totalAmount);
    const commissionP = parseFloat(formData.commissionPercentage);

    if (!isNaN(total) && !isNaN(commissionP)) {
      const commAmt = (total * commissionP) / 100;
      setCommissionAmount(commAmt);
      setNetPay(total - commAmt);
    } else {
      setCommissionAmount(0);
      setNetPay(0);
    }
  }, [formData.totalAmount, formData.commissionPercentage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) {
      toast.error('User not authenticated.');
      setLoading(false);
      return;
    }

    const { startDate, endDate, totalAmount, commissionPercentage, notes } = formData;

    if (!startDate || !endDate || !totalAmount || !commissionPercentage) {
      toast.error('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const newPeriodId = uuidv4();
      const newPaymentPeriod: PaymentPeriod = {
        id: newPeriodId,
        startDate: ensureValidDate(startDate),
        endDate: ensureValidDate(endDate),
        totalAmount: parseFloat(totalAmount),
        commissionPercentage: parseFloat(commissionPercentage),
        commissionAmount: commissionAmount,
        netPay: netPay,
        paidAmount: 0,
        remainingAmount: netPay,
        status: 'unpaid' as PaymentStatus,
        payments: [],
        notes: notes || '',
      };

      const recordRef = doc(db, 'driverPay', driverPayRecord.id);

      // Fetch the latest record to avoid stale data conflicts
      const docSnap = await getDoc(recordRef);
      if (!docSnap.exists()) {
        toast.error('Driver Pay record not found.');
        setLoading(false);
        return;
      }
      const currentRecord = docSnap.data() as DriverPay;

      // Update the main record's totals and payment periods array
      const updatedTotalAmount = currentRecord.totalAmount + newPaymentPeriod.totalAmount;
      const updatedCommissionAmount = currentRecord.commissionAmount + newPaymentPeriod.commissionAmount;
      const updatedNetPay = currentRecord.netPay + newPaymentPeriod.netPay;
      const updatedRemainingAmount = currentRecord.remainingAmount + newPaymentPeriod.remainingAmount;

      const updatedPaymentPeriods = [...(currentRecord.paymentPeriods || []), newPaymentPeriod];

      // Recalculate main status based on new periods
      let newStatus: PaymentStatus = 'paid';
      if (updatedRemainingAmount > 0) {
        newStatus = updatedRemainingAmount === updatedNetPay ? 'unpaid' : 'partially_paid';
      }

      await updateDoc(recordRef, {
        paymentPeriods: arrayUnion(newPaymentPeriod), // Use arrayUnion to add new period
        totalAmount: updatedTotalAmount,
        commissionAmount: updatedCommissionAmount,
        netPay: updatedNetPay,
        remainingAmount: updatedRemainingAmount,
        status: newStatus,
        updatedAt: new Date(),
      });

      // Fetch the updated record to pass back to the parent
      const updatedDocSnap = await getDoc(recordRef);
      if (updatedDocSnap.exists()) {
        onPeriodAdded(updatedDocSnap.data() as DriverPay);
      }

      toast.success('Payment period added successfully!');
      onClose();
    } catch (error) {
      console.error('Error adding payment period:', error);
      toast.error('Failed to add payment period.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Add New Payment Period</h2>

      <FormField
        label="Start Date"
        type="date"
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
        required
      />
      <FormField
        label="End Date"
        type="date"
        value={formData.endDate}
        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
        required
      />
      <FormField
        label="Total Amount"
        type="number"
        value={formData.totalAmount}
        onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
        placeholder="e.g., 1000"
        required
      />
      <FormField
        label="Commission Percentage (%)"
        type="number"
        value={formData.commissionPercentage}
        onChange={(e) => setFormData({ ...formData, commissionPercentage: e.target.value })}
        placeholder="e.g., 20"
        min="0"
        max="100"
        step="0.01"
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Calculated Commission Amount</p>
          <p className="font-medium text-yellow-600">£{commissionAmount.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Calculated Net Pay</p>
          <p className="font-medium text-green-600">£{netPay.toFixed(2)}</p>
        </div>
      </div>

      <TextArea
        label="Notes (optional)"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Add any specific notes for this payment period"
      />

      <div className="flex justify-end space-x-3 border-t pt-4 mt-4">
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
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Period'}
        </button>
      </div>
    </form>
  );
};

export default AddPaymentPeriodModal;