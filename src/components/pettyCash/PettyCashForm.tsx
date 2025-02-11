// src/components/pettyCash/PettyCashForm.tsx

import React, { useState } from 'react';
import { addDoc, collection, updateDoc, doc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { PettyCashTransaction } from '../../types/pettyCash';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface PettyCashFormProps {
  transaction?: PettyCashTransaction;
  onClose: () => void;
}

const PettyCashForm: React.FC<PettyCashFormProps> = ({ transaction, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: transaction?.name || '',
    telephone: transaction?.telephone || '',
    description: transaction?.description || '',
    amountIn: transaction?.amountIn?.toString() || '',
    amountOut: transaction?.amountOut?.toString() || '',
    note: transaction?.note || '',
    status: transaction?.status || 'pending',
    date: transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    time: transaction?.date ? new Date(transaction.date).toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const amountIn = parseFloat(formData.amountIn) || 0;
      const amountOut = parseFloat(formData.amountOut) || 0;

      if (amountIn > 0 && amountOut > 0) {
        throw new Error('Transaction cannot have both in and out amounts');
      }

      // Get all previous transactions ordered by date
      const q = query(collection(db, 'pettyCash'), orderBy('date', 'asc'));
      const snapshot = await getDocs(q);
      let runningBalance = 0;

      // Calculate running balance up to this transaction's date
      const currentDate = new Date(`${formData.date}T${formData.time}`);
      snapshot.forEach(doc => {
        const data = doc.data();
        const transactionDate = data.date.toDate();
        
        // Only include transactions before or equal to current transaction's date
        // Skip the current transaction if we're editing
        if (transactionDate <= currentDate && doc.id !== transaction?.id) {
          runningBalance += (data.amountIn || 0) - (data.amountOut || 0);
        }
      });

      // Calculate new balance for this transaction
      const newBalance = runningBalance + (amountIn - amountOut);

      const transactionData = {
        name: formData.name,
        telephone: formData.telephone,
        description: formData.description,
        amountIn,
        amountOut,
        balance: newBalance, // Set the calculated balance
        note: formData.note,
        status: formData.status,
        date: new Date(`${formData.date}T${formData.time}`),
        updatedAt: new Date(),
      };

      if (transaction) {
        await updateDoc(doc(db, 'pettyCash', transaction.id), {
          ...transactionData,
          updatedBy: user.id,
        });
        toast.success('Transaction updated successfully');
      } else {
        await addDoc(collection(db, 'pettyCash'), {
          ...transactionData,
          createdAt: new Date(),
          createdBy: user.id,
        });
        toast.success('Transaction created successfully');
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      toast.error(error.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  // Rest of the component remains the same...
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields remain the same... */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <FormField
          type="tel"
          label="Telephone"
          value={formData.telephone}
          onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
          required
        />

        <div className="col-span-2">
          <FormField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
          />
        </div>

        <FormField
          type="number"
          label="Amount In (£)"
          value={formData.amountIn}
          onChange={(e) => setFormData({ ...formData, amountIn: e.target.value, amountOut: '' })}
          min="0"
          step="0.01"
          placeholder="0.00"
        />

        <FormField
          type="number"
          label="Amount Out (£)"
          value={formData.amountOut}
          onChange={(e) => setFormData({ ...formData, amountOut: e.target.value, amountIn: '' })}
          min="0"
          step="0.01"
          placeholder="0.00"
        />

        <FormField
          type="date"
          label="Date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <FormField
          type="time"
          label="Time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          required
        />

        <div className="col-span-2">
          <TextArea
            label="Note"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Add any additional notes..."
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as PettyCashTransaction['status'] })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
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
          {loading ? 'Saving...' : transaction ? 'Update Transaction' : 'Create Transaction'}
        </button>
      </div>
    </form>
  );
};

export default PettyCashForm;
