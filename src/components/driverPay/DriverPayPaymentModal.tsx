import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { DriverPay, PaymentPeriod } from '../../types/driverPay';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ensureValidDate } from '../../utils/dateHelpers';

interface DriverPayPaymentModalProps {
  record: DriverPay;   // comes from table/card; we will refresh canonical doc by id
  onClose: () => void;
}

const DriverPayPaymentModal: React.FC<DriverPayPaymentModalProps> = ({ record, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Canonical periods loaded from Firestore (avoid “last-2 only” overwrite bug)
  const [periods, setPeriods] = useState<PaymentPeriod[]>(
    Array.isArray(record.paymentPeriods) ? record.paymentPeriods : []
  );

  // Load the full, up-to-date driverPay doc by id (NO cross-doc merging)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'driverPay', record.id));
        if (!alive) return;
        const data = snap.exists() ? (snap.data() as DriverPay) : null;
        const fresh = (data?.paymentPeriods ?? []).map(p => ({
          ...p,
          startDate: ensureValidDate(p.startDate),
          endDate: ensureValidDate(p.endDate),
        }));
        // Sort newest first by endDate
        fresh.sort((a, b) => ensureValidDate(b.endDate).getTime() - ensureValidDate(a.endDate).getTime());
        setPeriods(fresh);
      } catch (e) {
        console.error('[DriverPayPaymentModal] load doc failed:', e);
        // fallback: normalize from prop
        const fallback = (record.paymentPeriods ?? []).map(p => ({
          ...p,
          startDate: ensureValidDate(p.startDate),
          endDate: ensureValidDate(p.endDate),
        })).sort((a, b) => ensureValidDate(b.endDate).getTime() - ensureValidDate(a.endDate).getTime());
        setPeriods(fallback);
      }
    })();
    return () => { alive = false; };
  }, [record.id]); // important: lock to this doc only

  // Pick default period: newest with remaining > 0, else newest
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  useEffect(() => {
    if (!periods.length) { setSelectedPeriodId(''); return; }
    const owing = periods.find(p => Number(p.remainingAmount ?? 0) > 0);
    setSelectedPeriodId(owing?.id || periods[0].id);
  }, [periods]);

  const selectedPeriod = useMemo(
    () => periods.find(p => p.id === selectedPeriodId),
    [periods, selectedPeriodId]
  );

  // Form inputs (keep old design behavior: prefill from stored remainingAmount)
  const [formData, setFormData] = useState({
    amount: '',
    method: 'cash' as const,
    reference: '',
    notes: ''
  });

  // Prefill strictly from stored remainingAmount (like your old modal)
  useEffect(() => {
    if (selectedPeriod) {
      const remaining = Number(selectedPeriod.remainingAmount ?? 0);
      setFormData(fd => ({ ...fd, amount: remaining > 0 ? remaining.toFixed(2) : '' }));
    } else {
      setFormData(fd => ({ ...fd, amount: '' }));
    }
  }, [selectedPeriod]);

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
    const remain = Number(selectedPeriod.remainingAmount ?? 0);
    
    // FIX: Compare rounded values to avoid floating-point precision errors.
    // We do this by converting pounds/dollars to cents/pennies (integers) before comparing.
    const amtInCents = Math.round(amt * 100);
    const remainInCents = Math.round(remain * 100);

    if (isNaN(amt) || amt <= 0 || amtInCents > remainInCents) {
      console.error('Payment validation failed. See details below:', {
        rawAmountInput: formData.amount,
        parsedAmount: amt,
        remainingAmount: remain,
        amountInCents: amtInCents,
        remainingInCents: remainInCents,
        isAmountNaN: isNaN(amt),
        isAmountZeroOrLess: amt <= 0,
        isAmountGreaterThanRemaining: amtInCents > remainInCents,
      });
      toast.error('Invalid payment amount');
      return;
    }

    setLoading(true);
    try {
      // Re-fetch the doc before write to avoid stomping older periods if someone else edited
      const snap = await getDoc(doc(db, 'driverPay', record.id));
      const data = snap.exists() ? (snap.data() as DriverPay) : null;
      const currentPeriods: PaymentPeriod[] = (data?.paymentPeriods ?? periods).map(p => ({
        ...p,
        startDate: ensureValidDate(p.startDate),
        endDate: ensureValidDate(p.endDate),
      }));

      // Build the payment entry
      const payment = {
        id: Date.now().toString(),
        date: new Date(),
        amount: parseFloat(amt.toFixed(2)),
        method: formData.method,
        reference: formData.reference || null,
        notes: formData.notes || null,
        createdBy: user.id,
        createdAt: new Date(),
        periodId: selectedPeriodId
      };

      // Update just that period, keep all others intact (no truncation)
      const updatedPeriods = currentPeriods.map(p => {
        if (p.id !== selectedPeriodId) return p;
        const newPaid = parseFloat(((Number(p.paidAmount ?? 0)) + amt).toFixed(2));
        const net = Number(p.netPay ?? 0);
        const newRemain = parseFloat((net - newPaid).toFixed(2));
        return {
          ...p,
          paidAmount: newPaid,
          remainingAmount: newRemain,
          status: newRemain <= 0 ? 'paid' : 'partially_paid',
          payments: Array.isArray(p.payments) ? [...p.payments, payment] : [payment]
        };
      });

      // (Optional) Recompute simple top-level sums to keep doc consistent
      const totals = updatedPeriods.reduce(
        (acc, x) => {
          acc.totalAmount += Number(x.totalAmount) || 0;
          acc.commissionAmount += Number(x.commissionAmount) || 0;
          acc.netPay += Number(x.netPay) || 0;
          acc.paidAmount += Number(x.paidAmount) || 0;
          acc.remainingAmount += Number(x.remainingAmount) || 0;
          return acc;
        },
        { totalAmount: 0, commissionAmount: 0, netPay: 0, paidAmount: 0, remainingAmount: 0 }
      );

      await updateDoc(doc(db, 'driverPay', record.id), {
        paymentPeriods: updatedPeriods,
        totalAmount: parseFloat(totals.totalAmount.toFixed(2)),
        commissionAmount: parseFloat(totals.commissionAmount.toFixed(2)),
        netPay: parseFloat(totals.netPay.toFixed(2)),
        paidAmount: parseFloat(totals.paidAmount.toFixed(2)),
        remainingAmount: parseFloat(totals.remainingAmount.toFixed(2)),
        status: totals.remainingAmount <= 0 ? 'paid' : totals.paidAmount > 0 ? 'partially_paid' : 'unpaid',
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
      <label className="block text-sm font-medium text-gray-700">Select Payment Period</label>
      <select
        className="mt-1 block w-full rounded-md border-gray-300"
        value={selectedPeriodId}
        onChange={e => setSelectedPeriodId(e.target.value)}
        required
      >
        {periods.map(p => (
          <option key={p.id} value={p.id}>
            {formatDate(p.startDate)} – {formatDate(p.endDate)} (£{Number(p.remainingAmount ?? 0).toFixed(2)} left)
          </option>
        ))}
      </select>

      {/* Summary (strictly from stored fields, like your old modal) */}
      {selectedPeriod && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Net Pay:</span>
            <span>£{Number(selectedPeriod.netPay ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-600">£{Number(selectedPeriod.paidAmount ?? 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Remaining:</span>
            <span className="text-amber-600">£{Number(selectedPeriod.remainingAmount ?? 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Payment inputs */}
      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amount}
        onChange={e => {
          setFormData(fd => ({ ...fd, amount: e.target.value }));
        }}
        required
        min="0.01"
        max={selectedPeriod ? Number(selectedPeriod.remainingAmount ?? 0).toFixed(2) : undefined}
        step="0.01"
      />

      <label className="block text-sm font-medium text-gray-700">Payment Method</label>
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
          disabled={loading || !selectedPeriod}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-60"
        >
          {loading ? 'Processing…' : 'Record Payment'}
        </button>
      </div>
    </form>
  );
};

export default DriverPayPaymentModal;