import React from 'react';
import Modal from '../../../components/ui/Modal';
import { Vehicle } from '../../../types';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import toast from 'react-hot-toast';
import { canDeleteVehicle } from '../../../utils/vehicleUtils';

interface VehicleDeleteModalProps {
  vehicle: Vehicle | null;
  onClose: () => void;
}

const VehicleDeleteModal: React.FC<VehicleDeleteModalProps> = ({
  vehicle,
  onClose,
}) => {
  const [loading, setLoading] = React.useState(false);

  if (!vehicle) return null;

  const handleDelete = async () => {
    if (!canDeleteVehicle(vehicle)) {
      toast.error('Only sold vehicles can be deleted');
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'vehicles', vehicle.id));
      toast.success('Vehicle deleted successfully');
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
            disabled={loading || !canDeleteVehicle(vehicle)}
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