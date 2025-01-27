// src/components/finance/TransactionForm.tsx

import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { useVehicles } from '../../hooks/useVehicles';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import SearchableSelect from '../ui/SearchableSelect';
import toast from 'react-hot-toast';

interface TransactionFormProps {
  type: 'income' | 'expense';
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ type, onClose }) => {
  const { user } = useAuth();
  const { vehicles } = useVehicles();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    customCategory: '',
    description: '',
    vehicleId: '',
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
      const finalCategory = formData.category === 'Other' 
        ? formData.customCategory 
        : formData.category;

      if (formData.category === 'Other' && !formData.customCategory.trim()) {
        toast.error('Please enter a custom category');
        return;
      }

      // Get vehicle details if selected
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);

      await addDoc(collection(db, 'transactions'), {
        type,
        date: new Date(formData.date),
        amount: parseFloat(formData.amount),
        category: finalCategory,
        description: formData.description,
        vehicleId: formData.vehicleId || null,
        vehicleName: selectedVehicle 
          ? `${selectedVehicle.make} ${selectedVehicle.model}`
          : null,
        vehicleOwner: selectedVehicle?.owner || null,
        createdAt: new Date(),
        createdBy: user?.id,
      });

      toast.success(`${type === 'income' ? 'Income' : 'Expense'} recorded successfully`);
      onClose();
    } catch (error) {
      console.error('Error recording transaction:', error);
      toast.error('Failed to record transaction');
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

      {/* Vehicle Selector */}
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
          {loading ? 'Recording...' : 'Record Transaction'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
