import React, { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { moveToTrash } from '../../utils/trashService';
interface VehicleDeleteModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

const VehicleDeleteModal: React.FC<VehicleDeleteModalProps> = ({ vehicle, onClose }) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth(); // Add this at the top of the component
  if (!vehicle) return null;

  const handleDelete = async () => {
  if (vehicle.status !== 'sold') {
    toast.error('Only sold vehicles can be deleted');
    return;
  }

  setLoading(true);
  try {
    // OLD: await deleteDoc(doc(db, 'vehicles', vehicle.id));
    const displayName = `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`;
    
    await moveToTrash(
      'vehicles', 
      vehicle.id, 
      vehicle, 
      user?.id || 'system', 
      displayName
    );

    toast.success('Vehicle moved to trash');
    onClose();
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    toast.error('Failed to delete vehicle');
  } finally {
    setLoading(false);
  }
};

  return (
    <Modal
      isOpen={!!vehicle}
      onClose={onClose}
      title="Delete Vehicle"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Are you sure you want to delete this vehicle? This action cannot be undone.
          All related maintenance logs, rentals, and claims will remain in the system.
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
            type="button"
            onClick={handleDelete}
            disabled={loading || vehicle.status !== 'sold'}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete Vehicle'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VehicleDeleteModal;