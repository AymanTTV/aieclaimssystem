import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface MileageUpdateFormProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess?: (vehicle: Vehicle) => void; // ✅ NEW
}

const MileageUpdateForm: React.FC<MileageUpdateFormProps> = ({ vehicle, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    newMileage: vehicle.mileage || 0,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const updatedMileage = parseInt(String(formData.newMileage), 10);

    if (isNaN(updatedMileage) || updatedMileage < (vehicle.mileage || 0)) {
      toast.error('New mileage must be greater than or equal to current mileage');
      return;
    }

    setLoading(true);

    try {
      const safeNote = formData.notes ? formData.notes.trim() : 'Monthly update';
      const safeName = user.name || user.displayName || 'Staff';

      const newEntry = {
        date: new Date(),
        mileage: updatedMileage,
        note: safeNote,
        updatedBy: safeName,
        source: 'form' as const
      };

      await updateDoc(doc(db, 'vehicles', vehicle.id), {
        mileage: updatedMileage,
        updatedAt: new Date(),
        mileageUpdates: arrayUnion(newEntry)
      });

      await addDoc(collection(db, 'mileageHistory'), {
        vehicleId: vehicle.id,
        previousMileage: vehicle.mileage || 0,
        newMileage: updatedMileage,
        date: new Date(),
        recordedBy: safeName,
        notes: safeNote,
      });

      // ✅ OPTIMISTIC UPDATE (instant UI fix)
      if (onSuccess) {
        onSuccess({
          ...vehicle,
          mileage: updatedMileage,
          updatedAt: new Date(),
          mileageUpdates: [...(vehicle.mileageUpdates || []), newEntry],
        });
      }

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
          Current mileage: {(vehicle.mileage || 0).toLocaleString()}
        </p>
        <FormField
          type="number"
          label="New Mileage"
          value={formData.newMileage}
          onChange={(e) =>
            setFormData({
              ...formData,
              newMileage: e.target.value ? parseInt(e.target.value, 10) : 0,
            })
          }
          min={vehicle.mileage || 0}
          required
        />
      </div>

      <TextArea
        label="Notes (Optional)"
        value={formData.notes}
        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
        placeholder="Add any relevant notes"
      />

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm text-white bg-primary rounded-md hover:bg-primary-600"
        >
          {loading ? 'Updating...' : 'Update Mileage'}
        </button>
      </div>
    </form>
  );
};

export default MileageUpdateForm;