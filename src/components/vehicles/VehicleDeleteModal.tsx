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
      size="md"
    >
      <div className="space-y-5">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-900 shadow-2xs">
          <p className="text-sm font-semibold text-rose-950">
            Are you sure you want to delete <span className="font-bold underline">{vehicle.registrationNumber}</span>?
          </p>
          <p className="text-xs text-rose-700 mt-2 leading-relaxed">
            This action will move the vehicle to Trash. All linked maintenance logs, rentals, and claims will remain safely archived in the system.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || vehicle.status !== 'sold'}
            className="px-5 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 border border-transparent rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? 'Deleting...' : 'Delete Vehicle'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VehicleDeleteModal;