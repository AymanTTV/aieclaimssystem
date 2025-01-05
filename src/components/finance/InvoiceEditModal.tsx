import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Invoice, Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import InvoicePaymentHistory from './InvoicePaymentHistory';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import toast from 'react-hot-toast';
import { Customer } from '../../types/customer';

interface InvoiceEditModalProps {
  invoice: Invoice;
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  invoice,
  vehicles,
  customers,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date(invoice.date).toISOString().split('T')[0],
    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
    amount: invoice.amount.toString(),
    amountToPay: '0',
    category: invoice.category === 'other' ? 'other' : invoice.category,
    customCategory: invoice.category === 'other' ? invoice.customCategory || invoice.category : '',
    vehicleId: invoice.vehicleId || '',
    description: invoice.description,
    customerId: invoice.customerId || '',
    customerName: invoice.customerName || '',
    useCustomCustomer: !!invoice.customerName,
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);
      const amountToPay = parseFloat(formData.amountToPay);
      const totalPaid = invoice.paidAmount + amountToPay;

      if (amount < totalPaid) {
        toast.error('Total amount cannot be less than amount already paid');
        return;
      }

      const remainingAmount = amount - totalPaid;
      const paymentStatus = totalPaid === 0 ? 'pending' : 
                          totalPaid === amount ? 'paid' : 
                          'partially_paid';

      // Create new payment record if amount to pay > 0
      const payments = [...(invoice.payments || [])];
      if (amountToPay > 0) {
        payments.push({
          id: Date.now().toString(),
          date: new Date(),
          amount: amountToPay,
          method: formData.paymentMethod,
          reference: formData.paymentReference,
          notes: formData.paymentNotes,
          createdAt: new Date(),
          createdBy: user.id
        });
      }

      // Update invoice
      const invoiceRef = doc(db, 'invoices', invoice.id);
      await updateDoc(invoiceRef, {
        date: new Date(formData.date),
        dueDate: new Date(formData.dueDate),
        amount,
        paidAmount: totalPaid,
        remainingAmount,
        category: formData.category === 'other' ? 'other' : formData.category,
        customCategory: formData.category === 'other' ? formData.customCategory : null,
        vehicleId: formData.vehicleId || null,
        description: formData.description,
        customerId: formData.useCustomCustomer ? null : formData.customerId,
        customerName: formData.useCustomCustomer ? formData.customerName : null,
        paymentStatus,
        payments,
        updatedAt: new Date()
      });

      // Create finance transaction for new payment
      if (amountToPay > 0) {
        const vehicle = vehicles.find(v => v.id === formData.vehicleId);
        await createFinanceTransaction({
          type: 'income',
          category: formData.category,
          amount: amountToPay,
          description: `Payment for invoice #${invoice.id.slice(-8).toUpperCase()}`,
          referenceId: invoice.id,
          vehicleId: formData.vehicleId || undefined,
          vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : undefined,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          paymentStatus
        });
      }

      toast.success('Invoice updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <div className="space-y-4">
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.useCustomCustomer}
              onChange={(e) => setFormData({ 
                ...formData, 
                useCustomCustomer: e.target.checked,
                customerId: '',
                customerName: ''
              })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Enter Customer Manually</span>
          </label>
        </div>

        {formData.useCustomCustomer ? (
          <FormField
            label="Customer Name"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            required
            placeholder="Enter customer name"
          />
        ) : (
          <SearchableSelect
            label="Select Customer"
            options={customers.map(c => ({
              id: c.id,
              label: c.name,
              subLabel: `${c.mobile} - ${c.email}`
            }))}
            value={formData.customerId}
            onChange={(id) => setFormData({ ...formData, customerId: id })}
            placeholder="Search customers..."
          />
        )}
      </div>

      {/* Basic Invoice Details */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Invoice Date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <FormField
          type="date"
          label="Due Date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          required
        />

        <FormField
          type="number"
          label="Total Amount"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          min={invoice.paidAmount}
          step="0.01"
          required
        />

        <FormField
          type="number"
          label="Amount to Pay"
          value={formData.amountToPay}
          onChange={(e) => setFormData({ ...formData, amountToPay: e.target.value })}
          min="0"
          max={parseFloat(formData.amount) - invoice.paidAmount}
          step="0.01"
        />
      </div>

      {/* Payment Details (if amount to pay > 0) */}
      {parseFloat(formData.amountToPay) > 0 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
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
            value={formData.paymentReference}
            onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
            placeholder="Enter payment reference or transaction ID"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Notes</label>
            <textarea
              value={formData.paymentNotes}
              onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="Add any notes about this payment"
            />
          </div>
        </div>
      )}

      {/* Payment Summary */}
<div className="bg-gray-50 p-4 rounded-lg space-y-2">
  <div className="flex justify-between text-sm">
    <span>Total Amount:</span>
    <span className="font-medium">£{(parseFloat(formData.amount) || 0).toFixed(2)}</span>
  </div>
  <div className="flex justify-between text-sm">
    <span>Previously Paid:</span>
    <span className="text-green-600">£{(invoice.paidAmount || 0).toFixed(2)}</span>
  </div>
  {parseFloat(formData.amountToPay) > 0 && (
    <div className="flex justify-between text-sm">
      <span>New Payment:</span>
      <span className="text-blue-600">£{(parseFloat(formData.amountToPay) || 0).toFixed(2)}</span>
    </div>
  )}
  <div className="flex justify-between text-sm">
    <span>Remaining After Payment:</span>
    <span className="text-amber-600">
      £{((parseFloat(formData.amount) || 0) - (invoice.paidAmount || 0) - (parseFloat(formData.amountToPay) || 0)).toFixed(2)}
    </span>
  </div>
</div>

      {/* Payment History */}
      <InvoicePaymentHistory
        payments={invoice.payments || []}
        onDownloadDocument={(url) => window.open(url, '_blank')}
      />

      {/* Form Actions */}
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
          {loading ? 'Updating...' : 'Update Invoice'}
        </button>
      </div>
    </form>
  );
};

export default InvoiceEditModal;