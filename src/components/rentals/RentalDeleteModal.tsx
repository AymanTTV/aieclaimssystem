import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental } from '../../types';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

interface RentalDeleteModalProps {
  rental: Rental;
  onClose: () => void;
}

const RentalDeleteModal: React.FC<RentalDeleteModalProps> = ({ rental, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (rental.status === 'active') {
      toast.error('Cannot delete an active rental');
      return;
    }

    setLoading(true);

    try {
      await deleteDoc(doc(db, 'rentals', rental.id));
      toast.success('Rental deleted successfully');
      onClose();
    } catch (error) {
      console.error('Error deleting rental:', error);
      toast.error('Failed to delete rental');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="text-lg font-medium">Delete Rental</h3>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Rental Details:</strong>
        </p>
        <ul className="mt-2 text-sm text-gray-600">
          <li>Status: {rental.status}</li>
          <li>Type: {rental.type}</li>
          <li>Cost: £{rental.cost.toFixed(2)}</li>
        </ul>
      </div>

      <p className="text-sm text-gray-500">
        Are you sure you want to delete this rental? This action cannot be undone.
      </p>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading || rental.status === 'active'}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Deleting...' : 'Delete Rental'}
        </button>
      </div>
    </div>
  );
};

export default RentalDeleteModal;