import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface MileageUpdateFormProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const MileageUpdateForm: React.FC<MileageUpdateFormProps> = ({ vehicle, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    newMileage: vehicle.mileage,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.newMileage < vehicle.mileage) {
      toast.error('New mileage cannot be less than current mileage');
      return;
    }

    setLoading(true);

    try {
      // Update vehicle mileage
      await updateDoc(doc(db, 'vehicles', vehicle.id), {
        mileage: formData.newMileage,
      });

      // Create mileage history record
      await addDoc(collection(db, 'mileageHistory'), {
        vehicleId: vehicle.id,
        previousMileage: vehicle.mileage,
        newMileage: formData.newMileage,
        date: new Date(),
        recordedBy: user.name,
        notes: formData.notes || null,
      });

      toast.success('Mileage updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating mileage:', error);
      toast.error('Failed to update mileage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm text-gray-500 mb-4">
          Current mileage: {vehicle.mileage.toLocaleString()}
        </p>
        <FormField
          type="number"
          label="New Mileage"
          value={formData.newMileage}
          onChange={(e) => setFormData({ ...formData, newMileage: parseInt(e.target.value) })}
          min={vehicle.mileage}
          required
        />
      </div>

      <TextArea
        label="Notes (Optional)"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Add any relevant notes about the mileage update"
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
          {loading ? 'Updating...' : 'Update Mileage'}
        </button>
      </div>
    </form>
  );
};

export default MileageUpdateForm;