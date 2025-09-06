// src/components/maintenance/ServiceCenterForm.tsx
import React, { useMemo, useState } from 'react';
import FormField from '../ui/FormField';
import {
  ServiceCenter,
  addServiceCenter,
  updateServiceCenter,
} from '../../utils/serviceCenters';
import toast from 'react-hot-toast';
import { Mail, Phone, MapPin, PoundSterling } from 'lucide-react';

interface ServiceCenterFormProps {
  center?: ServiceCenter;                 // if provided -> edit mode
  onClose: () => void;
  onSuccess: (center: ServiceCenter) => void; // called with the saved center (includes id)
}

const ServiceCenterForm: React.FC<ServiceCenterFormProps> = ({
  center,
  onClose,
  onSuccess,
}) => {
  const isEdit = !!center?.id;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: center?.name || '',
    address: center?.address || '',
    postcode: center?.postcode || '',
    phone: center?.phone || '',
    email: center?.email || '',
    hourlyRate: center?.hourlyRate != null ? String(center.hourlyRate) : '',
    specialties: Array.isArray(center?.specialties)
      ? center!.specialties.join(', ')
      : '',
  });

  const isValid = useMemo(() => {
    if (!formData.name.trim()) return false;
    if (!formData.address.trim()) return false;
    if (!formData.postcode.trim()) return false;
    if (formData.hourlyRate === '' || isNaN(parseFloat(formData.hourlyRate))) return false;
    return true;
  }, [formData]);

  const parsePayload = () => {
    const hourly = parseFloat(formData.hourlyRate || '0');
    const specialties = formData.specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      name: formData.name.trim(),
      address: formData.address.trim(),
      postcode: formData.postcode.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      hourlyRate: isNaN(hourly) ? 0 : hourly,
      specialties,
    };
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isValid) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    setLoading(true);
    try {
      const base = parsePayload();

      if (isEdit && center?.id) {
        await updateServiceCenter(center.id, base);
        toast.success('Service center updated');
        onSuccess({ id: center.id, ...base } as ServiceCenter);
      } else {
        const saved = await addServiceCenter({
          ...base,
          // addServiceCenter already sets createdAt in your utils
        } as Omit<ServiceCenter, 'id'>);
        toast.success('Service center added');
        onSuccess(saved); // has { id, ...base }
      }
    } catch (error) {
      console.error('Service center save error:', error);
      toast.error(`Failed to ${isEdit ? 'update' : 'add'} service center`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="space-y-5"
      onClick={(e) => e.stopPropagation()} // keep modal from closing when clicking inside
    >
      {/* Header */}
      <div className="mb-1">
        <h3 className="text-base font-semibold text-gray-900">
          {isEdit ? 'Edit Service Center' : 'Add Service Center'}
        </h3>
        <p className="text-sm text-gray-500">
          Please provide complete details. Fields marked with * are required.
        </p>
      </div>

      {/* Card: Basic Details */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Details</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Service Center Name *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Mile End Auto Repairs"
            required
          />

          <FormField
            label="Postcode *"
            value={formData.postcode}
            onChange={(e) =>
              setFormData({ ...formData, postcode: e.target.value })
            }
            placeholder="e.g., E3 4AB"
            required
            leftIcon={<MapPin className="h-4 w-4 text-gray-400" />}
          />

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="Street, City"
              required
            />
          </div>
        </div>
      </div>

      {/* Card: Contact & Rates */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Contact & Rates
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            label="Phone"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="+44 20 1234 5678"
            leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
          />

          <FormField
            type="email"
            label="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="workshop@example.com"
            leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
          />

          <FormField
            type="number"
            label="Hourly Rate (£) *"
            value={formData.hourlyRate}
            onChange={(e) =>
              setFormData({ ...formData, hourlyRate: e.target.value })
            }
            min="0"
            step="0.01"
            required
            placeholder="75.00"
            leftIcon={<PoundSterling className="h-4 w-4 text-gray-400" />}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Hourly rate will be used as default for labor calculations in maintenance logs. You can override it per job.
        </p>
      </div>

      {/* Card: Specialties */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Specialties</h4>
        <textarea
          value={formData.specialties}
          onChange={(e) =>
            setFormData({ ...formData, specialties: e.target.value })
          }
          rows={2}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Enter specialties separated by commas (e.g., tires, diagnostics, bodywork)"
        />
        <p className="text-xs text-gray-500 mt-2">
          Tip: separate by commas, e.g. <em>bodywork, tires, MOT, diagnostics</em>
        </p>
      </div>

      {/* Actions */}
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
          disabled={loading || !isValid}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-60"
        >
          {loading ? (isEdit ? 'Updating…' : 'Adding…') : isEdit ? 'Update Service Center' : 'Add Service Center'}
        </button>
      </div>
    </div>
  );
};

export default ServiceCenterForm;
