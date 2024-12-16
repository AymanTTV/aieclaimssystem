import React, { useState } from 'react';
import { Claim } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import toast from 'react-hot-toast';

interface ClaimEditModalProps {
  claim: Claim;
  onClose: () => void;
}

const ClaimEditModal: React.FC<ClaimEditModalProps> = ({ claim, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: claim.status,
    type: claim.type,
    assignedTo: claim.assignedTo,
    note: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const claimRef = doc(db, 'claims', claim.id);
      const newNote = {
        id: Date.now().toString(),
        date: new Date(),
        note: formData.note,
        author: user.name,
      };

      const updatedData = {
        status: formData.status,
        type: formData.type,
        assignedTo: formData.assignedTo,
        updatedAt: new Date(),
        updatedBy: user.id,
        progressNotes: [...claim.progressNotes, newNote],
      };

      await updateDoc(claimRef, updatedData);

      // Create finance transaction if claim is settled
      if (formData.status === 'settled' && claim.status !== 'settled') {
        const totalExpenses = claim.documents.invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const amount = claim.type === 'fault' ? 
          -claim.claimDetails.policyExcess : 
          totalExpenses;

        await createFinanceTransaction({
          type: amount > 0 ? 'income' : 'expense',
          category: 'claim-settlement',
          amount: Math.abs(amount),
          description: `Claim settlement for ${claim.type} claim`,
          referenceId: claim.id,
          vehicleId: claim.accidentId,
        });
      }

      toast.success('Claim updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating claim:', error);
      toast.error('Failed to update claim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as Claim['status'] })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="submitted">Submitted</option>
          <option value="in-progress">In Progress</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="settled">Settled</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value as 'fault' | 'non-fault' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="fault">Fault</option>
          <option value="non-fault">Non-Fault</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Assigned To</label>
        <input
          type="text"
          value={formData.assignedTo}
          onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Enter handler's name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Progress Note</label>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
          placeholder="Add a note about the status change..."
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
          {loading ? 'Updating...' : 'Update Claim'}
        </button>
      </div>
    </form>
  );
};

export default ClaimEditModal;