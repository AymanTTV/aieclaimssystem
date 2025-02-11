// src/components/finance/TransactionForm.tsx

import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useVehicles } from '../../hooks/useVehicles';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';
import { Transaction, Vehicle } from '../../types';

interface TransactionFormProps {
  type: 'income' | 'expense';
  transaction?: Transaction;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ type, transaction, onClose }) => {
  const { user } = useAuth();
  const { vehicles } = useVehicles();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    amount: transaction?.amount?.toString() || '',
    category: transaction?.category || '',
    customCategory: transaction?.customCategory || '',
    description: transaction?.description || '',
    vehicleId: transaction?.vehicleId || '',
    paymentStatus: transaction?.paymentStatus || 'pending',
    paymentMethod: transaction?.paymentMethod || 'cash',
    paymentReference: transaction?.paymentReference || '',
    status: transaction?.status || 'pending'
  });

  const categories = {
    income: [
      'Rental',
      'Insurance Claim',
      'Sale',
      'Vehicle Income',
      'Other'
    ],
    expense: [
      'Maintenance',
      'Insurance',
      'Fuel',
      'Registration',
      'Vehicle Test',
      'Repairs',
      'Parts',
      'Cleaning',
      'Other'
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.category === 'Other' && !formData.customCategory.trim()) {
        toast.error('Please enter a custom category');
        return;
      }

      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);

      const transactionData = {
        type,
        date: new Date(formData.date),
        amount: parseFloat(formData.amount),
        category: formData.category === 'Other' ? 'other' : formData.category,
        customCategory: formData.category === 'Other' ? formData.customCategory : null,
        description: formData.description,
        vehicleId: formData.vehicleId || null,
        vehicleName: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : null,
        vehicleOwner: selectedVehicle?.owner || null,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference || null,
        status: formData.status,
        updatedAt: new Date()
      };

      if (transaction) {
        // Update existing transaction
        await updateDoc(doc(db, 'transactions', transaction.id), {
          ...transactionData,
          updatedBy: user?.id
        });
        toast.success('Transaction updated successfully');
      } else {
        // Create new transaction
        await addDoc(collection(db, 'transactions'), {
          ...transactionData,
          createdAt: new Date(),
          createdBy: user?.id
        });
        toast.success('Transaction created successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        type="date"
        label="Date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        required
      />

      <FormField
        type="number"
        label="Amount"
        value={formData.amount}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
        min="0"
        step="0.01"
        required
      />

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
            {categories[type].map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {formData.category === 'Other' && (
          <FormField
            label="Custom Category"
            value={formData.customCategory}
            onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
            placeholder="Enter custom category"
            required
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

      <TextArea
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Status</label>
        <select
          value={formData.paymentStatus}
          onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="partially_paid">Partially Paid</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
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
          {loading ? 'Saving...' : transaction ? 'Update Transaction' : 'Create Transaction'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
