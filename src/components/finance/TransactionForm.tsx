import React, { useState } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useCustomers } from '../../hooks/useCustomers';
import { useVehicles } from '../../hooks/useVehicles';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { FINANCE_CATEGORIES } from '../../utils/financeCategories';
import toast from 'react-hot-toast';

interface TransactionFormProps {
  type: 'income' | 'expense';
  transaction?: any;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ type, transaction, onClose }) => {
  const { user } = useAuth();
  const { customers } = useCustomers();
  const { vehicles } = useVehicles();
  const [loading, setLoading] = useState(false);
  const [manualCustomer, setManualCustomer] = useState(false);

  const [formData, setFormData] = useState({
    date: transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    amount: transaction?.amount?.toString() || '',
    category: transaction?.category || '',
    description: transaction?.description || '',
    paymentMethod: transaction?.paymentMethod || 'cash',
    paymentReference: transaction?.paymentReference || '',
    paymentStatus: transaction?.paymentStatus || 'pending',
    status: transaction?.status || 'completed',
    customerId: transaction?.customerId || '',
    customerName: transaction?.customerName || '',
    vehicleId: transaction?.vehicleId || '',
    vehicleName: transaction?.vehicleName || ''
  });

  // Get all categories as a flat array for SearchableSelect
  const getAllCategories = () => {
    const categories = type === 'income' ? FINANCE_CATEGORIES.income : FINANCE_CATEGORIES.expense;
    const flatCategories: string[] = [];
    
    Object.values(categories).forEach(group => {
      if (Array.isArray(group)) {
        flatCategories.push(...group);
      } else if (typeof group === 'object') {
        Object.values(group).forEach(subgroup => {
          if (Array.isArray(subgroup)) {
            flatCategories.push(...subgroup);
          }
        });
      }
    });
    
    return flatCategories;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);

      const transactionData = {
        type,
        date: new Date(formData.date),
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference || null,
        paymentStatus: formData.paymentStatus,
        status: formData.status,
        customerId: manualCustomer ? null : formData.customerId || null,
        customerName: manualCustomer ? formData.customerName : 
                     customers.find(c => c.id === formData.customerId)?.name || null,
        vehicleId: formData.vehicleId || null,
        vehicleName: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : null,
        vehicleOwner: selectedVehicle?.owner || null,
        createdAt: new Date(),
        createdBy: user.id
      };

      if (transaction) {
        await updateDoc(doc(db, 'transactions', transaction.id), {
          ...transactionData,
          updatedAt: new Date(),
          updatedBy: user.id
        });
        toast.success('Transaction updated successfully');
      } else {
        await addDoc(collection(db, 'transactions'), transactionData);
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
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <SearchableSelect
          options={getAllCategories().map(category => ({
            id: category,
            label: category
          }))}
          value={formData.category}
          onChange={(value) => setFormData({ ...formData, category: value })}
          placeholder="Search categories..."
          required
        />
      </div>

      {/* Vehicle Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Related Vehicle (Optional)</label>
        <SearchableSelect
          options={vehicles.map(v => ({
            id: v.id,
            label: `${v.make} ${v.model}`,
            subLabel: v.registrationNumber
          }))}
          value={formData.vehicleId}
          onChange={(id) => setFormData({ ...formData, vehicleId: id })}
          placeholder="Search vehicles..."
        />
      </div>

      {/* Customer Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Customer</label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={manualCustomer}
              onChange={(e) => {
                setManualCustomer(e.target.checked);
                if (!e.target.checked) {
                  setFormData(prev => ({
                    ...prev,
                    customerId: '',
                    customerName: ''
                  }));
                }
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">Enter Manually</span>
          </label>
        </div>

        {manualCustomer ? (
          <FormField
            label="Customer Name"
            value={formData.customerName}
            onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
            placeholder="Enter customer name"
          />
        ) : (
          <SearchableSelect
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