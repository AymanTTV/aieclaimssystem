import React, { useState } from 'react';
import { Rental } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface RentalCompleteModalProps {
  rental: Rental;
  onClose: () => void;
}

const RentalCompleteModal: React.FC<RentalCompleteModalProps> = ({ rental, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [completionDate, setCompletionDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'rentals', rental.id), {
        status: 'completed',
        endDate: new Date(completionDate),
        updatedAt: new Date()
      });

      toast.success('Rental completed successfully');
      onClose();
    } catch (error) {
      console.error('Error completing rental:', error);
      toast.error('Failed to complete rental');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Are you sure you want to complete this rental?
      </p>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Completion Date
        </label>
        <input
          type="date"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
          max={format(new Date(), 'yyyy-MM-dd')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
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
          type="button"
          onClick={handleComplete}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Completing...' : 'Complete Rental'}
        </button>
      </div>
    </div>
  );
};

export default RentalCompleteModal;