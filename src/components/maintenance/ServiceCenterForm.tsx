import React, { useState } from 'react';
import FormField from '../ui/FormField';
import { ServiceCenter } from '../../utils/serviceCenters';
import toast from 'react-hot-toast';

interface ServiceCenterFormProps {
  center?: ServiceCenter;
  onClose: () => void;
  onSuccess: (center: ServiceCenter) => void;
}

const ServiceCenterForm: React.FC<ServiceCenterFormProps> = ({ center, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: center?.name || '',
    address: center?.address || '',
    postcode: center?.postcode || '',
    phone: center?.phone || '',
    email: center?.email || '',
    hourlyRate: center?.hourlyRate?.toString() || '',
    specialties: center?.specialties?.join(', ') || ''
  });

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.name || !formData.address || !formData.postcode || !formData.hourlyRate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const serviceCenter = {
        ...formData,
        hourlyRate: parseFloat(formData.hourlyRate),
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(Boolean),
        createdAt: new Date()
      };

      onSuccess(serviceCenter);
      toast.success(`Service center ${center ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error(`Error ${center ? 'updating' : 'adding'} service center:`, error);
      toast.error(`Failed to ${center ? 'update' : 'add'} service center`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
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
        type="email"
        label="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

      <div>
        <label className="block text-sm font-medium text-gray-700">Specialties</label>
        <textarea
          value={formData.specialties}
          onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Enter specialties separated by commas"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
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
          {loading ? `${center ? 'Updating...' : 'Adding...'}` : (center ? 'Update' : 'Add') + ' Service Center'}
        </button>
      </div>
    </div>
  );
};

export default ServiceCenterForm;