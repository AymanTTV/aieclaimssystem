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

  // Which period is selected
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    record.paymentPeriods[0]?.id || ''
  );

  // Form inputs
  const [formData, setFormData] = useState({
    amount: '',
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  // Find that period object
  const selectedPeriod = record.paymentPeriods.find(p => p.id === selectedPeriodId);

  // Whenever the selected period changes (or its remainingAmount), prefill the amount
  useEffect(() => {
    if (selectedPeriod) {
      const remaining = parseFloat(selectedPeriod.remainingAmount.toFixed(2));
      setFormData(fd => ({
        ...fd,
        amount: remaining.toFixed(2)
      }));
    } else {
      setFormData(fd => ({ ...fd, amount: '' }));
    }
  }, [selectedPeriod, record.paymentPeriods]);

  const formatDate = (d: Date | null | undefined) => {
    if (!d) return 'N/A';
    try {
      return format(ensureValidDate(d), 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedPeriod) return;

    const amt = parseFloat(formData.amount);
    const remain = parseFloat(selectedPeriod.remainingAmount.toFixed(2));
    if (amt <= 0 || amt > remain) {
      toast.error('Invalid payment amount');
      return;
    }

    setLoading(true);
    try {
      const payment = {
        id: Date.now().toString(),
        date: new Date(),
        amount: amt,
        method: formData.method,
        reference: formData.reference || null,
        notes: formData.notes || null,
        createdBy: user.id,
        createdAt: new Date(),
        periodId: selectedPeriodId
      };

      const updatedPeriods = record.paymentPeriods.map(p => {
        if (p.id === selectedPeriodId) {
          const newPaid = parseFloat((p.paidAmount + amt).toFixed(2));
          const newRemain = parseFloat((p.netPay - newPaid).toFixed(2));
          return {
            ...p,
            paidAmount: newPaid,
            remainingAmount: newRemain,
            status: newRemain <= 0 ? 'paid' : 'partially_paid',
            payments: [...p.payments, payment]
          };
        }
        return p;
      });

      await updateDoc(doc(db, 'driverPay', record.id), {
        paymentPeriods: updatedPeriods,
        updatedAt: new Date()
      });

      toast.success('Payment recorded successfully');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Choose period */}
      <label className="block text-sm font-medium text-gray-700">
  Select Payment Period
</label>
<select
  className="mt-1 block w-full rounded-md border-gray-300"
  value={selectedPeriodId}
  onChange={e => setSelectedPeriodId(e.target.value)}
  required
>
  {record.paymentPeriods.map(p => (
    <option key={p.id} value={p.id}>
      {formatDate(p.startDate)} – {formatDate(p.endDate)} (£{p.remainingAmount.toFixed(2)} left)
    </option>
  ))}
</select>

      {/* Summary */}
      {selectedPeriod && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Net Pay:</span>
            <span>£{selectedPeriod.netPay.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-600">£{selectedPeriod.paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Remaining:</span>
            <span className="text-amber-600">£{selectedPeriod.remainingAmount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Payment inputs */}
      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amount}
        onChange={e => {
          let val = parseFloat(e.target.value);
          if (!isNaN(val) && selectedPeriod) {
            const max = parseFloat(selectedPeriod.remainingAmount.toFixed(2));
            val = Math.min(val, max);
            setFormData(fd => ({ ...fd, amount: val.toFixed(2) }));
          } else {
            setFormData(fd => ({ ...fd, amount: '' }));
          }
        }}
        required
        min="0"
        max={selectedPeriod?.remainingAmount.toFixed(2)}
        step="0.01"
      />

<label className="block text-sm font-medium text-gray-700">
  Payment Method
</label>
<select
  className="mt-1 block w-full rounded-md border-gray-300"
  value={formData.method}
  onChange={e => setFormData(fd => ({ ...fd, method: e.target.value as any }))}
  required
>
  <option value="cash">Cash</option>
  <option value="bank_transfer">Bank Transfer</option>
  <option value="cheque">Cheque</option>
</select>


      <FormField
        label="Reference"
        value={formData.reference}
        onChange={e => setFormData(fd => ({ ...fd, reference: e.target.value }))}
        placeholder="Transaction ID, cheque no., etc."
      />

      <TextArea
        label="Notes (optional)"
        value={formData.notes}
        onChange={e => setFormData(fd => ({ ...fd, notes: e.target.value }))}
        placeholder="Any notes about this payment"
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
          {loading ? 'Processing…' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
};

export default DriverPayPaymentModal;
