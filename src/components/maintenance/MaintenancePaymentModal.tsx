import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MaintenanceLog, Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';

interface MaintenancePaymentModalProps {
  log: MaintenanceLog;
  vehicle?: Vehicle;
  onClose: () => void;
}

const MaintenancePaymentModal: React.FC<MaintenancePaymentModalProps> = ({
  log,
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

  const paid = log.paidAmount || 0;
  const total = log.cost || 0;
  const remaining = (log.remainingAmount != null)
    ? log.remainingAmount
    : total - paid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('User not authenticated.');
      return;
    }

    const paymentAmount = parseFloat(formData.amountToPay);
    if (isNaN(paymentAmount) || paymentAmount <= 0 || paymentAmount > remaining) {
      toast.error(`Invalid payment amount. Must be between £0.01 and ${formatCurrency(remaining)}`);
      return;
    }

    setLoading(true);
    try {
      // update maintenance log
      const newPaid = paid + paymentAmount;
      const newRemaining = total - newPaid;
      const newStatus =
        newRemaining <= 0.001 ? 'paid' :
        newPaid > 0 ? 'partially_paid' : 'unpaid';

      await updateDoc(doc(db, 'maintenanceLogs', log.id), {
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        paymentStatus: newStatus,
        paymentMethod: formData.method,
        paymentReference: formData.reference || null,
        notes: formData.notes || log.notes || null,
        updatedAt: new Date(),
        updatedBy: user.id
      });

      const vehicleOwner = vehicle?.owner
  ? {
      name: vehicle.owner.name,
      isDefault: vehicle.owner.isDefault ?? false,
    }
  : undefined;

      // create finance transaction
      await createFinanceTransaction({
        type: 'expense',
        category: log.type,
        amount: paymentAmount,
        description: formData.notes || log.description,
        referenceId: log.id,
        vehicleId: log.vehicleId,
        vehicleName: `${vehicle!.make} ${vehicle!.model} (${vehicle!.registrationNumber})`,
        vehicleOwner,
        paymentMethod: formData.method,
        paymentReference: formData.reference || undefined,
        paymentStatus: newStatus,
        status: 'completed',
        date: new Date()
      });

      toast.success('Payment recorded successfully');
      onClose();
    } catch (err) {
      console.error('Error recording maintenance payment:', err);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
  <div className="flex justify-between text-sm font-medium">
    <span>NET:</span>
    <span>{formatCurrency(log.netAmount!)}</span>
  </div>
  <div className="flex justify-between text-sm">
    <span>VAT:</span>
    <span>{formatCurrency(log.vatAmount!)}</span>
  </div>
  {log.totalDiscount! > 0 && (
    <div className="flex justify-between text-sm text-red-600">
      <span>Discount:</span>
      <span>–{formatCurrency(log.totalDiscount!)}</span>
    </div>
  )}
  <div className="flex justify-between text-lg font-medium">
    <span>Total:</span>
    <span>{formatCurrency(log.cost)}</span>
  </div>
  <div className="flex justify-between text-sm text-green-600">
    <span>Paid:</span>
    <span>{formatCurrency(paid)}</span>
  </div>
  <div className="flex justify-between text-sm text-amber-600">
    <span>Owing:</span>
    <span>{formatCurrency(remaining)}</span>
  </div>
</div>



      {/* Payment Inputs */}
      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amountToPay}
        onChange={(e) => setFormData(prev => ({ ...prev, amountToPay: e.target.value }))}
        required
        min="0.01"
        max={remaining}
        step="0.01"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select
          value={formData.method}
          onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value as any }))}
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
        label="Reference (Optional)"
        value={formData.reference}
        onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
        placeholder="Transaction ID or check number"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Add any payment notes"
        />
      </div>

      {/* Actions */}
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

export default MaintenancePaymentModal;
