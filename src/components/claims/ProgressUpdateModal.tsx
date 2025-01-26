import React, { useState } from 'react';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { ClaimProgress } from '../../types/claim';
import { generateClaimDocuments } from '../../utils/claimDocuments';

interface ProgressUpdateModalProps {
  claimId: string;
  currentProgress: ClaimProgress;
  onClose: () => void;
  onUpdate: () => void;
}

const PROGRESS_OPTIONS = [
  'Your Claim Has Started',
  'Reported to Legal Team',
  'Engineer Report Pending',
  'Awaiting TPI',
  'Claim in Progress',
  'Claim Complete'
] as const;

const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  claimId,
  currentProgress,
  onClose,
  onUpdate
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ClaimProgress>(currentProgress);
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const claimRef = doc(db, 'claims', claimId);
      
      // Get current claim data
      const claimDoc = await getDoc(claimRef);
      if (!claimDoc.exists()) {
        throw new Error('Claim not found');
      }
      const claimData = claimDoc.data();

      const newProgressEntry = {
        id: Date.now().toString(),
        date: new Date(),
        status: progress,
        note,
        author: user.name
      };

      await updateDoc(claimRef, {
        progress,
        progressHistory: arrayUnion(newProgressEntry),
        updatedAt: new Date(),
        updatedBy: user.id
      });

      // If status is changed to complete, generate satisfaction notice
      
        // await generateClaimDocuments(claimId, {
        //   id: claimId,
        //   ...claimData,
        //   progress
        // });
      

      toast.success('Progress updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Progress Status</label>
        <select
          value={progress}
          onChange={(e) => setProgress(e.target.value as ClaimProgress)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          {PROGRESS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      <TextArea
        label="Progress Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add details about this progress update..."
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
          {loading ? 'Updating...' : 'Update Progress'}
        </button>
      </div>
    </form>
  );
};

export default ProgressUpdateModal;
