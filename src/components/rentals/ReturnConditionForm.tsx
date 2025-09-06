// src/components/rentals/ReturnConditionForm.tsx
import React, { useEffect, useState } from 'react';
import { VehicleCondition, ReturnCondition } from '../../types/rental';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import FileUpload from '../ui/FileUpload';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

interface ReturnConditionFormProps {
  checkOutCondition: VehicleCondition;
  initialCondition?: ReturnCondition; // Prefill if editing existing return
  onSubmit: (condition: Omit<ReturnCondition, 'id' | 'createdAt' | 'createdBy'>) => void;
  onClose: () => void;
}

const ReturnConditionForm: React.FC<ReturnConditionFormProps> = ({
  checkOutCondition,
  initialCondition,
  onSubmit,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // ✅ Safe fallbacks if checkOutCondition is missing at runtime
  const checkoutMileage = Number(checkOutCondition?.mileage ?? 0);
  const checkoutFuel = (checkOutCondition?.fuelLevel ?? '100') as VehicleCondition['fuelLevel'];

  // New uploads only
  const [images, setImages] = useState<File[]>([]);
  // Existing images (editable/removable in edit mode)
  const [existingImgs, setExistingImgs] = useState<string[]>(initialCondition?.images ?? []);

  // Normalize date value
  const asDate = (v: any): Date | null => {
    try {
      if (!v) return null;
      if (v instanceof Date) return v;
      if (typeof v?.toDate === 'function') return v.toDate();
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  // ---- FORM STATE ----
  const initDT = asDate(initialCondition?.date) ?? new Date();
  const [formData, setFormData] = useState({
    date: initDT.toISOString().split('T')[0],
    time: initDT.toTimeString().slice(0, 5),
    mileage: initialCondition?.mileage ?? checkoutMileage,
    fuelLevel: (initialCondition?.fuelLevel ?? checkoutFuel) as VehicleCondition['fuelLevel'],
    isClean: initialCondition?.isClean ?? true,
    hasDamage: initialCondition?.hasDamage ?? false,
    damageDescription: initialCondition?.damageDescription ?? '',
    damageCost: initialCondition?.damageCost ?? 0,
    fuelCharge: initialCondition?.fuelCharge ?? 0,
    cleaningCharge: initialCondition?.cleaningCharge ?? 0
  });

  // 🔁 Refill the form when initialCondition arrives/changes
  useEffect(() => {
    if (!initialCondition) return;
    const d = asDate(initialCondition.date) ?? new Date();
    setFormData({
      date: d.toISOString().split('T')[0],
      time: d.toTimeString().slice(0, 5),
      mileage: initialCondition.mileage ?? checkoutMileage,
      fuelLevel: (initialCondition.fuelLevel ?? checkoutFuel) as VehicleCondition['fuelLevel'],
      isClean: initialCondition.isClean ?? true,
      hasDamage: initialCondition.hasDamage ?? false,
      damageDescription: initialCondition.damageDescription ?? '',
      damageCost: initialCondition.damageCost ?? 0,
      fuelCharge: initialCondition.fuelCharge ?? 0,
      cleaningCharge: initialCondition.cleaningCharge ?? 0
    });
    setExistingImgs(initialCondition.images ?? []);
  }, [initialCondition, checkoutMileage, checkoutFuel]);

  // Show fields if condition applies OR there is already a stored non-zero value
  const showFuelChargeField =
    Number(formData.fuelCharge) > 0 ||
    ((parseInt(formData.fuelLevel as string, 10) || 0) <
      (parseInt(checkoutFuel as string, 10) || 0));

  const showCleaningChargeField = !formData.isClean || Number(formData.cleaningCharge) > 0;

  const calculateCharges = (): number => {
    let total = 0;

    if (formData.hasDamage) total += Number(formData.damageCost) || 0;

    const fuelDiff =
      (parseInt(checkoutFuel as string, 10) || 0) -
      (parseInt(formData.fuelLevel as string, 10) || 0);

    // Add fuel charge if deficit OR a stored value exists
    if (fuelDiff > 0 || Number(formData.fuelCharge) > 0) {
      total += Number(formData.fuelCharge) || 0;
    }

    if (!formData.isClean || Number(formData.cleaningCharge) > 0) {
      total += Number(formData.cleaningCharge) || 0;
    }

    return total;
  };

  const handleRemoveExistingImage = (idx: number) => {
    setExistingImgs(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Upload newly added images
      const newImageUrls = await Promise.all(
        images.map(async (file) => {
          const ts = Date.now();
          const storageRef = ref(storage, `vehicle-conditions/${ts}_${file.name}`);
          const snap = await uploadBytes(storageRef, file);
          return getDownloadURL(snap.ref);
        })
      );

      const conditionData: Omit<ReturnCondition, 'id' | 'createdAt' | 'createdBy'> = {
        type: 'check-in',
        date: new Date(`${formData.date}T${formData.time}`),
        mileage: Number(formData.mileage) || 0,
        fuelLevel: formData.fuelLevel as VehicleCondition['fuelLevel'],
        isClean: !!formData.isClean,
        hasDamage: !!formData.hasDamage,
        damageDescription: formData.hasDamage ? formData.damageDescription : '',
        damageCost: formData.hasDamage ? (Number(formData.damageCost) || 0) : 0,
        fuelCharge: showFuelChargeField ? (Number(formData.fuelCharge) || 0) : 0,
        cleaningCharge: showCleaningChargeField ? (Number(formData.cleaningCharge) || 0) : 0,
        totalCharges: calculateCharges(),
        // Keep existing (minus any removed) and append new uploads
        images: [...existingImgs, ...newImageUrls],
      };

      onSubmit(conditionData);
    } catch (err) {
      console.error('Error saving return condition:', err);
      toast.error('Failed to save return condition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Heads-up if no checkout condition found */}
      {!checkOutCondition && (
        <div className="text-sm text-yellow-800 bg-yellow-100 border border-yellow-200 rounded p-2">
          No check-out condition found. Using safe defaults.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <FormField
          type="time"
          label="Time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          required
        />

        <FormField
          type="number"
          label="Mileage"
          value={formData.mileage}
          onChange={(e) =>
            setFormData({ ...formData, mileage: parseInt(e.target.value || '0', 10) })
          }
          required
          min={checkoutMileage}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Fuel Level</label>
          <select
            value={formData.fuelLevel}
            onChange={(e) =>
              setFormData({
                ...formData,
                fuelLevel: e.target.value as VehicleCondition['fuelLevel']
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="0">Empty (0%)</option>
            <option value="25">Quarter (25%)</option>
            <option value="50">Half (50%)</option>
            <option value="75">Three Quarters (75%)</option>
            <option value="100">Full (100%)</option>
          </select>
        </div>
      </div>

      {/* Existing images (editable) */}
      {existingImgs.length > 0 && (
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Existing Images ({existingImgs.length})
          </label>
          <div className="grid grid-cols-3 gap-2">
            {existingImgs.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} className="w-full h-24 object-cover rounded border" />
                <button
                  type="button"
                  onClick={() => handleRemoveExistingImage(i)}
                  className="absolute top-1 right-1 bg-white/90 text-red-600 text-xs px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition"
                  title="Remove"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isClean"
            checked={formData.isClean}
            onChange={(e) => setFormData({ ...formData, isClean: e.target.checked })}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <label htmlFor="isClean" className="text-sm text-gray-700">
            Vehicle is clean
          </label>
        </div>

        {showCleaningChargeField && (
          <FormField
            type="number"
            label="Cleaning Charge"
            value={formData.cleaningCharge}
            onChange={(e) =>
              setFormData({ ...formData, cleaningCharge: parseFloat(e.target.value || '0') })
            }
            min="0"
            step="0.01"
            required={!formData.isClean}
          />
        )}

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hasDamage"
              checked={formData.hasDamage}
              onChange={(e) => setFormData({ ...formData, hasDamage: e.target.checked })}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="hasDamage" className="text-sm text-gray-700">
              Vehicle has damage
            </label>
          </div>

          {formData.hasDamage && (
            <>
              <TextArea
                label="Damage Description"
                value={formData.damageDescription}
                onChange={(e) => setFormData({ ...formData, damageDescription: e.target.value })}
                required
              />
              <FormField
                type="number"
                label="Damage Cost"
                value={formData.damageCost}
                onChange={(e) =>
                  setFormData({ ...formData, damageCost: parseFloat(e.target.value || '0') })
                }
                min="0"
                step="0.01"
                required
              />
            </>
          )}
        </div>

        {showFuelChargeField && (
          <FormField
            type="number"
            label="Fuel Charge"
            value={formData.fuelCharge}
            onChange={(e) =>
              setFormData({ ...formData, fuelCharge: parseFloat(e.target.value || '0') })
            }
            min="0"
            step="0.01"
            required={
              (parseInt(formData.fuelLevel as string, 10) || 0) <
              (parseInt(checkoutFuel as string, 10) || 0)
            }
          />
        )}
      </div>

      {/* ✅ This is the part you asked for (unchanged label) */}
      <div>
        <FileUpload
          label="Add Return Condition Images"
          accept="image/*"
          multiple
          onChange={setImages}
          showPreview
        />
      </div>

      {/* Charges Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <h4 className="font-medium text-gray-900">Additional Charges Summary</h4>
        {formData.hasDamage && (
          <div className="flex justify-between text-sm">
            <span>Damage Cost:</span>
            <span>£{Number(formData.damageCost || 0).toFixed(2)}</span>
          </div>
        )}
        {showFuelChargeField && (
          <div className="flex justify-between text-sm">
            <span>Fuel Charge:</span>
            <span>£{Number(formData.fuelCharge || 0).toFixed(2)}</span>
          </div>
        )}
        {showCleaningChargeField && (
          <div className="flex justify-between text-sm">
            <span>Cleaning Charge:</span>
            <span>£{Number(formData.cleaningCharge || 0).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>Total Additional Charges:</span>
          <span>£{calculateCharges().toFixed(2)}</span>
        </div>
      </div>

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
          {loading ? 'Saving...' : (initialCondition ? 'Update Return Condition' : 'Save Return Condition')}
        </button>
      </div>
    </form>
  );
};

export default ReturnConditionForm;
