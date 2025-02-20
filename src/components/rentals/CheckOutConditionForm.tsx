// src/components/rentals/CheckOutConditionForm.tsx

import React, { useState } from 'react';
import { VehicleCondition } from '../../types/rental';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import FormField from '../ui/FormField';
import FileUpload from '../ui/FileUpload';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import Compressor from 'compressorjs';

interface CheckOutConditionFormProps {
  onSubmit: (condition: Omit<VehicleCondition, 'id' | 'createdAt' | 'createdBy'>) => void;
  onClose: () => void;
  initialMileage?: number;
}

const CheckOutConditionForm: React.FC<CheckOutConditionFormProps> = ({
  onSubmit,
  onClose,
  initialMileage = 0
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    mileage: initialMileage,
    fuelLevel: '100' as VehicleCondition['fuelLevel'],
    isClean: true,
    hasDamage: false,
    damageDescription: ''
  });

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      new Compressor(file, {
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1080,
        success: (result) => {
          resolve(new File([result], file.name, { type: 'image/jpeg' }));
        },
        error: (err) => {
          console.error('Image compression error:', err);
          reject(err);
        }
      });
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Compress and upload images
      const compressedImages = await Promise.all(images.map(compressImage));
      const imageUrls = await Promise.all(
        compressedImages.map(async (file) => {
          const timestamp = Date.now();
          const storageRef = ref(storage, `vehicle-conditions/${timestamp}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          return getDownloadURL(snapshot.ref);
        })
      );

      // Create condition record
      const conditionData: Omit<VehicleCondition, 'id' | 'createdAt' | 'createdBy'> = {
        date: new Date(`${formData.date}T${formData.time}`),
        mileage: formData.mileage,
        fuelLevel: formData.fuelLevel,
        isClean: formData.isClean,
        hasDamage: formData.hasDamage,
        damageDescription: formData.hasDamage ? formData.damageDescription : undefined,
        images: imageUrls,
        type: 'check-out'
      };

      onSubmit(conditionData);
    } catch (error) {
      console.error('Error saving check-out condition:', error);
      toast.error('Failed to save vehicle condition');
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
          min={0}
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
              Vehicle has existing damage
            </label>
          </div>

          {formData.hasDamage && (
            <TextArea
              label="Damage Description"
              value={formData.damageDescription}
              onChange={(e) => setFormData({ ...formData, damageDescription: e.target.value })}
              required
            />
          )}
        </div>
      </div>

      <div>
        <FileUpload
          label="Vehicle Condition Images"
          accept="image/*"
          multiple
          onChange={setImages}
          showPreview
          maxFiles={10}
          maxSize={10 * 1024 * 1024} // 10MB
        />
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
          {loading ? 'Saving...' : 'Save Condition'}
        </button>
      </div>
    </form>
  );
};

export default CheckOutConditionForm;
