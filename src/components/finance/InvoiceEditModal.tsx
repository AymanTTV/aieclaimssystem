// src/components/finance/InvoiceEditModal.tsx
import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Invoice, Vehicle } from '../../types';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import { Customer } from '../../types/customer';

interface InvoiceEditModalProps {
  invoice: Invoice;
  vehicles: Vehicle[];
  customers: Customer[]; // Add this prop
  onClose: () => void;
}

const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({ invoice, vehicles, customers, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
  date: new Date(invoice.date).toISOString().split('T')[0],
  dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
  amount: invoice.amount.toString(),
  category: invoice.category === 'other' ? 'other' : invoice.category,
  customCategory: invoice.category === 'other' ? invoice.customCategory || invoice.category : '',
  vehicleId: invoice.vehicleId || '',
  description: invoice.description,
  paymentStatus: invoice.paymentStatus,
  // Add these fields
  customerId: invoice.customerId || '',
  customerName: invoice.customerName || '',
  useCustomCustomer: !!invoice.customerName
});


  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const invoiceRef = doc(db, 'invoices', invoice.id);
    await updateDoc(invoiceRef, {
      ...formData,
      date: new Date(formData.date),
      dueDate: new Date(formData.dueDate),
      amount: parseFloat(formData.amount),
      // Properly handle the category
      category: formData.category === 'other' ? 'other' : formData.category,
      customCategory: formData.category === 'other' ? formData.customCategory : null,
      customerId: formData.useCustomCustomer ? null : formData.customerId,
      customerName: formData.useCustomCustomer ? formData.customerName : null,
      updatedAt: new Date()
    });

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields similar to InvoiceForm but with pre-filled values */}
      {/* ... Copy the form fields from InvoiceForm component ... */}
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
      </div>

      <FormField
        type="number"
        label="Amount"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        min="0"
        step="0.01"
        required
      />

      {/* Category with custom field */}
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

      {/* Payment Status */}
<div>
  <label className="block text-sm font-medium text-gray-700">Payment Status</label>
  <select
    value={formData.paymentStatus}
    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as 'paid' | 'unpaid' })}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
    required
  >
    <option value="unpaid">Unpaid</option>
    <option value="paid">Paid</option>
  </select>
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
          {loading ? 'Updating...' : 'Update Invoice'}
        </button>
      </div>
    </form>
  );
};

export default InvoiceEditModal;
