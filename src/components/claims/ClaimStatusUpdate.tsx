import React, { useState } from 'react';
import { Claim } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface ClaimStatusUpdateProps {
  claim: Claim;
  onUpdate: () => void;
}

const ClaimStatusUpdate: React.FC<ClaimStatusUpdateProps> = ({ claim, onUpdate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(claim.status);
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const claimRef = doc(db, 'claims', claim.id);
      const newNote = {
        id: Date.now().toString(),
        date: new Date(),
        note,
        author: user.name
      };

      await updateDoc(claimRef, {
        status,
        updatedAt: new Date(),
        progressNotes: [...claim.progressNotes, newNote]
      });

      toast.success('Claim status updated successfully');
      onUpdate();
      setNote('');
    } catch (error) {
      console.error('Error updating claim status:', error);
      toast.error('Failed to update claim status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Claim['status'])}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="in-progress">In Progress</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="settled">Settled</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Progress Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Add a note about the status change..."
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          {loading ? 'Updating...' : 'Update Status'}
        </button>
      </div>
    </form>
  );
};

export default ClaimStatusUpdate;