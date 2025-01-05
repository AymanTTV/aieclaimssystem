import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import toast from 'react-hot-toast';
import { Customer } from '../../types/customer';

interface InvoiceFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({ vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    amount: '',
    amountPaid: '0',
    category: '',
    customCategory: '',
    vehicleId: '',
    description: '',
    customerId: '',
    customerName: '',
    useCustomCustomer: false,
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
      const amountPaid = parseFloat(formData.amountPaid);

      if (amountPaid > amount) {
        toast.error('Paid amount cannot exceed total amount');
        return;
      }

      const remainingAmount = amount - amountPaid;
      const paymentStatus = amountPaid === 0 ? 'pending' : 
                          amountPaid === amount ? 'paid' : 
                          'partially_paid';

      // Get vehicle details if selected
      const vehicle = formData.vehicleId ? vehicles.find(v => v.id === formData.vehicleId) : undefined;
      const vehicleName = vehicle ? `${vehicle.make} ${vehicle.model}` : undefined;

      // Create initial payment if any amount is paid
      const payments = amountPaid > 0 ? [{
        id: Date.now().toString(),
        date: new Date(),
        amount: amountPaid,
        method: formData.paymentMethod,
        reference: formData.paymentReference,
        notes: formData.paymentNotes,
        createdAt: new Date(),
        createdBy: user.id
      }] : [];

      // Create invoice
      const docRef = await addDoc(collection(db, 'invoices'), {
        date: new Date(formData.date),
        dueDate: new Date(formData.dueDate),
        amount,
        paidAmount: amountPaid,
        remainingAmount,
        category: formData.category === 'other' ? 'other' : formData.category,
        customCategory: formData.category === 'other' ? formData.customCategory : null,
        vehicleId: formData.vehicleId || null,
        description: formData.description,
        customerId: formData.useCustomCustomer ? null : formData.customerId,
        customerName: formData.useCustomCustomer ? formData.customerName : null,
        paymentStatus,
        payments,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create finance transaction for paid amount
      if (amountPaid > 0) {
        await createFinanceTransaction({
          type: 'income',
          category: formData.category,
          amount: amountPaid,
          description: `Initial payment for invoice #${docRef.id.slice(-8).toUpperCase()}`,
          referenceId: docRef.id,
          vehicleId: formData.vehicleId || undefined,
          vehicleName,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          paymentStatus
        });
      }

      toast.success('Invoice created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
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
          required
          min="0.01"
          step="0.01"
        />

        <FormField
          type="number"
          label="Amount Paid"
          value={formData.amountPaid}
          onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
          min="0"
          max={formData.amount || 0}
          step="0.01"
        />
      </div>

      {/* Category */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="">Select category</option>
            <option value="service">Service</option>
            <option value="repair">Repair</option>
            <option value="parts">Parts</option>
            <option value="other">Other</option>
          </select>
        </div>

        {formData.category === 'other' && (
          <FormField
            label="Custom Category"
            value={formData.customCategory}
            onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
            required
            placeholder="Enter custom category"
          />
        )}
      </div>

      {/* Vehicle Selection */}
      <SearchableSelect
        label="Related Vehicle (Optional)"
        options={vehicles.map(v => ({
          id: v.id,
          label: `${v.make} ${v.model}`,
          subLabel: v.registrationNumber
        }))}
        value={formData.vehicleId}
        onChange={(id) => setFormData({ ...formData, vehicleId: id })}
        placeholder="Search vehicles..."
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      {/* Payment Details (if amount paid > 0) */}
      {parseFloat(formData.amountPaid) > 0 && (
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
      {formData.amount && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Amount:</span>
            <span className="font-medium">£{parseFloat(formData.amount || '0').toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-600">£{parseFloat(formData.amountPaid || '0').toFixed(2)}</span>
          </div>
          {parseFloat(formData.amount) > parseFloat(formData.amountPaid) && (
            <div className="flex justify-between text-sm">
              <span>Remaining Amount:</span>
              <span className="text-amber-600">
                 £{((parseFloat(formData.amount) || 0) - (invoice.paidAmount || 0) - (parseFloat(formData.amountToPay) || 0)).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Payment Status:</span>
            <span className="font-medium capitalize">
              {parseFloat(formData.amountPaid || '0') === 0 ? 'Pending' :
               parseFloat(formData.amountPaid) === parseFloat(formData.amount) ? 'Paid' :
               'Partially Paid'}
            </span>
          </div>
        </div>
      )}

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
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
};

export default InvoiceForm;