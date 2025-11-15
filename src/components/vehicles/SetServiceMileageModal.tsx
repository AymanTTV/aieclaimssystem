import React, { useState } from 'react';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
// NEW: Import addDoc and collection to create history records
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types';
import toast from 'react-hot-toast';
// NEW: Import useAuth to get the current user
import { useAuth } from '../../context/AuthContext';

interface SetServiceMileageModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const SetServiceMileageModal: React.FC<SetServiceMileageModalProps> = ({ vehicle, onClose }) => {
  // NEW: Get the current user
  const { user } = useAuth();
  const [mileage, setMileage] = useState<string>(
    vehicle.mileage.toString()
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to perform this action.');
      return;
    }

    const newMileageValue = parseInt(mileage, 10);
    if (isNaN(newMileageValue) || newMileageValue < vehicle.mileage) {
      toast.error('Please enter a valid number that is greater than or equal to the current mileage.');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Update the main mileage on the vehicle document
      await updateDoc(doc(db, 'vehicles', vehicle.id), {
        mileage: newMileageValue,
        updatedAt: new Date(),
      });

      // Step 2: Create a new record in the 'mileageHistory' collection
      await addDoc(collection(db, 'mileageHistory'), {
        vehicleId: vehicle.id,
        previousMileage: vehicle.mileage,
        newMileage: newMileageValue,
        date: new Date(),
        recordedBy: user.name, // Use the logged-in user's name
        notes: 'Mileage updated via service modal.', // Add a default note
      });

      toast.success('Mileage updated and history recorded successfully');
      onClose();
    } catch (err) {
      console.error('Error updating mileage:', err);
      toast.error('Failed to update mileage. Please try again.');
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
        <p className="text-sm text-gray-500">
          Current mileage: {vehicle.mileage.toLocaleString()}
        </p>
        <FormField
          type="number"
          label="New Mileage"
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