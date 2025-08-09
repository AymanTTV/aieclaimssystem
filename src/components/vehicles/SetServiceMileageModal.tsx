import React, { useState } from 'react';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types';
import toast from 'react-hot-toast';

interface SetServiceMileageModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const SetServiceMileageModal: React.FC<SetServiceMileageModalProps> = ({ vehicle, onClose }) => {
  const [mileage, setMileage] = useState<string>(
    vehicle.mileage.toString()
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(mileage, 10);
    if (isNaN(val) || val < vehicle.mileage) {
      toast.error('Enter a number ≥ current mileage');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'vehicles', vehicle.id), {
        mileage: val,
        updatedAt: new Date()
      });
      toast.success('Mileage updated');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Update Mileage for ${vehicle.registrationNumber}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          type="number"
          label="Current Mileage"
          value={mileage}
          onChange={e => setMileage(e.target.value)}
          min={vehicle.mileage}
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
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SetServiceMileageModal;
