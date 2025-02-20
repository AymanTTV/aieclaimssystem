// src/components/rentals/ReturnConditionForm.tsx

import React, { useState } from 'react';
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
  onSubmit: (condition: Omit<ReturnCondition, 'id' | 'createdAt' | 'createdBy'>) => void;
  onClose: () => void;
}

const ReturnConditionForm: React.FC<ReturnConditionFormProps> = ({
  checkOutCondition,
  onSubmit,
  onClose
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    mileage: checkOutCondition.mileage,
    fuelLevel: checkOutCondition.fuelLevel,
    isClean: true,
    hasDamage: false,
    damageDescription: '',
    damageCost: 0,
    fuelCharge: 0,
    cleaningCharge: 0
  });

  // Calculate charges
  const calculateCharges = () => {
    let totalCharges = 0;

    // Add damage cost if present
    if (formData.hasDamage) {
      totalCharges += formData.damageCost;
    }

    // Calculate fuel charge if fuel level is lower
    const fuelLevelDiff = parseInt(checkOutCondition.fuelLevel) - parseInt(formData.fuelLevel);
    if (fuelLevelDiff > 0) {
      totalCharges += formData.fuelCharge;
    }

    // Add cleaning charge if vehicle is not clean
    if (!formData.isClean) {
      totalCharges += formData.cleaningCharge;
    }

    return totalCharges;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Upload images
      const imageUrls = await Promise.all(
        images.map(async (file) => {
          const timestamp = Date.now();
          const storageRef = ref(storage, `vehicle-conditions/${timestamp}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          return getDownloadURL(snapshot.ref);
        })
      );

      // Calculate total charges
      const totalCharges = calculateCharges();

      // Create return condition record
      const conditionData: Omit<ReturnCondition, 'id' | 'createdAt' | 'createdBy'> = {
        date: new Date(`${formData.date}T${formData.time}`),
        mileage: formData.mileage,
        fuelLevel: formData.fuelLevel,
        isClean: formData.isClean,
        hasDamage: formData.hasDamage,
        damageDescription: formData.hasDamage ? formData.damageDescription : undefined,
        images: imageUrls,
        type: 'check-in',
        damageCost: formData.hasDamage ? formData.damageCost : undefined,
        fuelCharge: formData.fuelCharge > 0 ? formData.fuelCharge : undefined,
        cleaningCharge: !formData.isClean ? formData.cleaningCharge : undefined,
        totalCharges
      };

      onSubmit(conditionData);
    } catch (error) {
      console.error('Error saving return condition:', error);
      toast.error('Failed to save return condition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
          required
          min={checkOutCondition.mileage}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Fuel Level</label>
          <select
            value={formData.fuelLevel}
            onChange={(e) => setFormData({ ...formData, fuelLevel: e.target.value as VehicleCondition['fuelLevel'] })}
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

        {!formData.isClean && (
          <FormField
            type="number"
            label="Cleaning Charge"
            value={formData.cleaningCharge}
            onChange={(e) => setFormData({ ...formData, cleaningCharge: parseFloat(e.target.value) })}
            min="0"
            step="0.01"
            required
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
                onChange={(e) => setFormData({ ...formData, damageCost: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
                required
              />
            </>
          )}
        </div>

        {parseInt(formData.fuelLevel) < parseInt(checkOutCondition.fuelLevel) && (
          <FormField
            type="number"
            label="Fuel Charge"
            value={formData.fuelCharge}
            onChange={(e) => setFormData({ ...formData, fuelCharge: parseFloat(e.target.value) })}
            min="0"
            step="0.01"
            required
          />
        )}
      </div>

      <div>
        <FileUpload
          label="Vehicle Condition Images"
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
            <span>£{formData.damageCost.toFixed(2)}</span>
          </div>
        )}
        {parseInt(formData.fuelLevel) < parseInt(checkOutCondition.fuelLevel) && (
          <div className="flex justify-between text-sm">
            <span>Fuel Charge:</span>
            <span>£{formData.fuelCharge.toFixed(2)}</span>
          </div>
        )}
        {!formData.isClean && (
          <div className="flex justify-between text-sm">
            <span>Cleaning Charge:</span>
            <span>£{formData.cleaningCharge.toFixed(2)}</span>
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
          {loading ? 'Saving...' : 'Save Return Condition'}
        </button>
      </div>
    </form>
  );
};

export default ReturnConditionForm;
