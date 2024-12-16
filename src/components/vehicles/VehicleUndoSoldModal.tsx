import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types';
import toast from 'react-hot-toast';

interface VehicleUndoSoldModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleUndoSoldModal: React.FC<VehicleUndoSoldModalProps> = ({ vehicle, onClose }) => {
  const [loading, setLoading] = useState(false);

  const handleUndo = async () => {
    setLoading(true);

    try {
      await updateDoc(doc(db, 'vehicles', vehicle.id), {
        status: 'active',
        soldDate: null,
        salePrice: null,
      });

      toast.success('Vehicle sale status undone successfully');
      onClose();
    } catch (error) {
      console.error('Error undoing vehicle sale:', error);
      toast.error('Failed to undo vehicle sale status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Are you sure you want to undo the sold status for this vehicle? This will remove the sale price and date information.
      </p>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleUndo}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700"
        >
          {loading ? 'Processing...' : 'Undo Sold Status'}
        </button>
      </div>
    </div>
  );
};

export default VehicleUndoSoldModal;