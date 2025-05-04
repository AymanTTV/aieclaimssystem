import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DriverPay } from '../../types/driverPay';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';

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
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(record.paymentPeriods[0]?.id || '');
  const [formData, setFormData] = useState({
    amount: '',
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  const selectedPeriod = record.paymentPeriods.find(p => p.id === selectedPeriodId);

  useEffect(() => {
    if (selectedPeriod) {
      const roundedRemainingAmount = parseFloat(selectedPeriod.remainingAmount.toFixed(2));
      setFormData({
        ...formData,
        amount: roundedRemainingAmount.toFixed(2)
      });
    } else {
      setFormData({ ...formData, amount: '' });
    }
  }, [selectedPeriod, record.paymentPeriods]);

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'N/A';
    try {
      const validDate = ensureValidDate(date);
      return format(validDate, 'dd/MM/yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'N/A';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPeriod) return;
    
    const paymentAmount = parseFloat(formData.amount);
    const roundedRemainingAmount = selectedPeriod?.remainingAmount ? parseFloat(selectedPeriod.remainingAmount.toFixed(2)) : 0;

    if (paymentAmount <= 0 || paymentAmount > roundedRemainingAmount) {
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
        createdAt: new Date(),
        periodId: selectedPeriodId
      };

      const updatedPeriods = record.paymentPeriods.map(period => {
        if (period.id === selectedPeriodId) {
          const newPaidAmount = parseFloat((period.paidAmount + paymentAmount).toFixed(2));
          const newRemainingAmount = parseFloat((period.netPay - newPaidAmount).toFixed(2));
          return {
            ...period,
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: newRemainingAmount <= 0 ? 'paid' : 'partially_paid',
            payments: [...period.payments, payment]
          };
        }
        return period;
      });

      await updateDoc(doc(db, 'driverPay', record.id), {
        paymentPeriods: updatedPeriods,
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
      <div>
        <label className="block text-sm font-medium text-gray-700">Select Payment Period</label>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          {record.paymentPeriods.map((period) => (
            <option key={period.id} value={period.id}>
              {formatDate(period.startDate)} - {formatDate(period.endDate)}
              {' '}(£{period.remainingAmount.toFixed(2)} remaining)
            </option>
          ))}
        </select>
      </div>

      {selectedPeriod && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex justify-between text-sm">
            <span>Net Pay:</span>
            <span className="font-medium">£{selectedPeriod.netPay.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-600">£{selectedPeriod.paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Remaining Amount:</span>
            <span className="text-amber-600">£{selectedPeriod.remainingAmount.toFixed(2)}</span>
          </div>
        </div>
      )}

      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amount}
        onChange={(e) => {
          let value = parseFloat(e.target.value);
          if (!isNaN(value)) {
            const roundedRemainingAmount = selectedPeriod?.remainingAmount ? parseFloat(selectedPeriod.remainingAmount.toFixed(2)) : 0;
            value = Math.min(value, roundedRemainingAmount);
            setFormData({ ...formData, amount: value.toFixed(2) });
          } else {
            setFormData({ ...formData, amount: '' });
          }
        }}
        required
        min="0"
        max={selectedPeriod?.remainingAmount.toFixed(2)}
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
          <option key="cash" value="cash">Cash</option>
          <option key="bank_transfer" value="bank_transfer">Bank Transfer</option>
          <option key="cheque" value="cheque">Cheque</option>
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