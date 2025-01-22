// src/components/maintenance/ServiceCenterForm.tsx

import React, { useState } from 'react';
import FormField from '../ui/FormField';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface ServiceCenterFormProps {
  onClose: () => void;
  onSuccess: (center: {
    id?: string;
    name: string;
    address: string;
    postcode: string;
    hourlyRate: number;
  }) => void;
}

const ServiceCenterForm: React.FC<ServiceCenterFormProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    postcode: '',
    phone: '',
    hourlyRate: '',
    specialties: [] as string[]
  });

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.postcode || !formData.hourlyRate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const serviceCenter = {
        ...formData,
        hourlyRate: parseFloat(formData.hourlyRate),
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'serviceCenters'), serviceCenter);
      
      onSuccess({
        id: docRef.id,
        name: serviceCenter.name,
        address: serviceCenter.address,
        postcode: serviceCenter.postcode,
        hourlyRate: serviceCenter.hourlyRate
      });
      
      toast.success('Service center added successfully');
      onClose();
    } catch (error) {
      console.error('Error adding service center:', error);
      toast.error('Failed to add service center');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <FormField
        label="Service Center Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <textarea
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      <FormField
        label="Postcode"
        value={formData.postcode}
        onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
        required
      />

      <FormField
        label="Phone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
      />

      <FormField
        type="number"
        label="Hourly Rate (£)"
        value={formData.hourlyRate}
        onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
        min="0"
        step="0.01"
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
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600"
        >
          {loading ? 'Adding...' : 'Add Service Center'}
        </button>
      </div>
    </div>
  );
};

export default ServiceCenterForm;
