import React, { useState } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Transaction, Vehicle } from '../../types';
import { useVehicles } from '../../hooks/useVehicles';
import VehicleSelect from '../VehicleSelect';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';

const CATEGORIES = {
  income: [
    'Rental',
    'Insurance Claim',
    'Sale',
    'Vehicle Income',
    'Other Income'
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
    'Other Expense'
  ]
};

interface TransactionFormProps {
  type: 'income' | 'expense';
  transaction?: Transaction;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ type, transaction, onClose }) => {
  const { vehicles } = useVehicles();
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(transaction?.vehicleId || '');
  const [formData, setFormData] = useState({
    date: transaction?.date ? transaction.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    amount: transaction?.amount.toString() || '',
    category: transaction?.category || '',
    description: transaction?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const transactionData = {
        type,
        date: new Date(formData.date),
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        vehicleId: selectedVehicleId || null,
        createdAt: new Date(),
      };

      if (transaction) {
        await updateDoc(doc(db, 'transactions', transaction.id), transactionData);
      } else {
        await addDoc(collection(db, 'transactions'), transactionData);
      }

      toast.success(`${type === 'income' ? 'Income' : 'Expense'} ${transaction ? 'updated' : 'recorded'} successfully`);
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error(`Failed to ${transaction ? 'update' : 'record'} transaction`);
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

      <div>
        <label className="block text-sm font-medium text-gray-700">Category</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="">Select category</option>
          {CATEGORIES[type].map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Related Vehicle (Optional)</label>
        <VehicleSelect
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onSelect={setSelectedVehicleId}
          required={false}
        />
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
          {loading ? 'Saving...' : transaction ? 'Update' : 'Record'} {type === 'income' ? 'Income' : 'Expense'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;