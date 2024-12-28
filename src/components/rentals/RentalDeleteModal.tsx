import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

interface RentalDeleteModalProps {
  rentalId: string;
  onClose: () => void;
}

const RentalDeleteModal: React.FC<RentalDeleteModalProps> = ({ rentalId, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!rentalId) {
      toast.error('Invalid rental ID');
      return;
    }

    setLoading(true);

    try {
      const rentalRef = doc(db, 'rentals', rentalId);
      await deleteDoc(rentalRef);
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
      
      <p className="text-sm text-gray-500">
        Are you sure you want to delete this rental? This action cannot be undone.
      </p>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Deleting...' : 'Delete Rental'}
        </button>
      </div>
    </div>
  );
};

export default RentalDeleteModal;