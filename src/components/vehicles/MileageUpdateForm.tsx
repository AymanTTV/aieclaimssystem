// src/components/vehicles/MileageUpdateForm.tsx
import React, { useState } from 'react';
import { addDoc, collection, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface MileageUpdateFormProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSuccess?: (vehicle: Vehicle) => void; 
  editingRecord?: any; 
}

// Helper to format firestore date to YYYY-MM-DD to auto-fill the old used date
const getYYYYMMDD = (d: any) => {
   if (!d) return new Date().toISOString().split('T')[0];
   const dateObj = d?.toDate ? d.toDate() : new Date(d);
   if (isNaN(dateObj.getTime())) return new Date().toISOString().split('T')[0];
   return dateObj.toISOString().split('T')[0];
}

const MileageUpdateForm: React.FC<MileageUpdateFormProps> = ({ vehicle, onClose, onSuccess, editingRecord }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    date: getYYYYMMDD(editingRecord?.date),
    newMileage: editingRecord?.newMileage || vehicle.mileage || 0,
    notes: editingRecord?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const updatedMileage = parseInt(String(formData.newMileage), 10);
    if (isNaN(updatedMileage)) {
      toast.error('Invalid mileage entered.');
      return;
    }

    setLoading(true);

    try {
      const safeNote = formData.notes ? formData.notes.trim() : 'Monthly update';
      const safeName = user.name || (user as any).displayName || 'Staff';
      const selectedDate = new Date(formData.date);

      // 1. Update or Add to the mileageHistory collection
      if (editingRecord) {
         await updateDoc(doc(db, 'mileageHistory', editingRecord.id), {
             newMileage: updatedMileage,
             notes: safeNote,
             date: selectedDate
         });
      } else {
         await addDoc(collection(db, 'mileageHistory'), {
            vehicleId: vehicle.id,
            previousMileage: vehicle.mileage || 0,
            newMileage: updatedMileage,
            date: selectedDate,
            recordedBy: safeName,
            notes: safeNote,
            source: 'form'
         });
      }

      // 2. REBUILD THE SYNCHRONIZED ARRAY
      const q = query(collection(db, 'mileageHistory'), where('vehicleId', '==', vehicle.id));
      const snap = await getDocs(q);
      const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      history.sort((a: any, b: any) => {
         const d1 = a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime();
         const d2 = b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime();
         return d1 - d2;
      });

      const newArray = history.map((h: any) => ({
         date: h.date,
         mileage: h.newMileage,
         note: h.notes || '',
         updatedBy: h.recordedBy || 'System',
         source: h.source || 'form',
         historyId: h.id
      }));

      // The vehicle's main mileage becomes the latest chronological entry
      const latestMileage = history.length > 0 ? history[history.length - 1].newMileage : (vehicle.mileage || 0);

      await updateDoc(doc(db, 'vehicles', vehicle.id), {
         mileageUpdates: newArray,
         mileage: latestMileage,
         updatedAt: new Date()
      });

      if (onSuccess) {
        onSuccess({
          ...vehicle,
          mileage: latestMileage,
          updatedAt: new Date(),
          mileageUpdates: newArray as any,
        });
      }

      toast.success(editingRecord ? 'Mileage record updated' : 'Mileage added successfully');
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
      <FormField
        type="date"
        label="Record Date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        required
      />
      <div>
        {!editingRecord && (
          <p className="text-sm text-gray-500 mb-2">
            Current mileage: {(vehicle.mileage || 0).toLocaleString()}
          </p>
        )}
        <FormField
          type="number"
          label="Mileage Reading"
          value={formData.newMileage}
          onChange={(e) =>
            setFormData({
              ...formData,
              newMileage: e.target.value ? parseInt(e.target.value, 10) : 0,
            })
          }
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
          className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-md hover:bg-primary-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? 'Saving...' : editingRecord ? 'Save Changes' : 'Update Mileage'}
        </button>
      </div>
    </form>
  );
};

export default MileageUpdateForm;