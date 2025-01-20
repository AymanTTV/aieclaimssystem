import React, { useState } from 'react';
import { Invoice } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface InvoicePaymentModalProps {
  invoice: Invoice;
  vehicle?: Vehicle;
  onClose: () => void;
}

const InvoicePaymentModal: React.FC<InvoicePaymentModalProps> = ({
  invoice,
  vehicle,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amountToPay: invoice.remainingAmount.toString(),
    method: 'cash' as const,
    reference: '',
    notes: '',
    document: null as File | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const paymentAmount = parseFloat(formData.amountToPay);
    if (paymentAmount <= 0 || paymentAmount > invoice.remainingAmount) {
      toast.error('Invalid payment amount');
      return;
    }

    setLoading(true);

    try {
      let documentUrl;
      if (formData.document) {
        const storageRef = ref(storage, `invoices/${invoice.id}/payments/${Date.now()}`);
        const snapshot = await uploadBytes(storageRef, formData.document);
        documentUrl = await getDownloadURL(snapshot.ref);
      }

      const payment = {
        id: Date.now().toString(),
        date: new Date(),
        amount: paymentAmount,
        method: formData.method,
        reference: formData.reference,
        notes: formData.notes,
        document: documentUrl || null,
        createdAt: new Date(),
        createdBy: user.id
      };

      const newPaidAmount = invoice.paidAmount + paymentAmount;
      const newRemainingAmount = invoice.amount - newPaidAmount;
      const newPaymentStatus = newRemainingAmount <= 0 ? 'paid' : 'partially_paid';

      // Update invoice
      await updateDoc(doc(db, 'invoices', invoice.id), {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
        payments: [...(invoice.payments || []), payment],
        updatedAt: new Date()
      });

      // Create finance transaction
      await createFinanceTransaction({
        type: 'income',
        category: invoice.category,
        amount: paymentAmount,
        description: `Partial payment for invoice #${invoice.id.slice(-8).toUpperCase()}`,
        referenceId: invoice.id,
        vehicleId: invoice.vehicleId,
        vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : undefined,
        paymentMethod: formData.method,
        paymentReference: formData.reference,
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
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between text-sm">
          <span>Invoice Total:</span>
          <span className="font-medium">£{invoice.amount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Amount Paid:</span>
          <span className="text-green-600">£{invoice.paidAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Remaining Amount:</span>
          <span className="text-amber-600">£{invoice.remainingAmount.toFixed(2)}</span>
        </div>
      </div>

      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amountToPay}
        onChange={(e) => setFormData({ ...formData, amountToPay: e.target.value })}
        required
        min="0.01"
        max={invoice.remainingAmount}
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

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Document</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                <span>Upload a file</span>
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFormData({ ...formData, document: e.target.files?.[0] || null })}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF or image up to 10MB</p>
          </div>
        </div>
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

export default InvoicePaymentModal;