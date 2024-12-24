import React, { useState } from 'react';
import { Vehicle } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDateForInput } from '../../utils/dateHelpers';
import FormField from '../ui/FormField';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface VehicleFormProps {
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmit: (data: Partial<Vehicle>) => Promise<void>;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ vehicle, onClose, onSubmit }) => {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(vehicle?.image || null);

  const [formData, setFormData] = useState({
    vin: vehicle?.vin || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    registrationNumber: vehicle?.registrationNumber || '',
    mileage: vehicle?.mileage || 0,
    motExpiry: formatDateForInput(vehicle?.motExpiry),
    insuranceExpiry: formatDateForInput(vehicle?.insuranceExpiry),
    roadTaxExpiry: formatDateForInput(vehicle?.roadTaxExpiry),
    nslExpiry: formatDateForInput(vehicle?.nslExpiry),
    lastMaintenance: formatDateForInput(vehicle?.lastMaintenance),
    nextMaintenance: formatDateForInput(vehicle?.nextMaintenance),
  });

  if (!can('vehicles', vehicle ? 'update' : 'create')) {
    return <div>You don't have permission to {vehicle ? 'edit' : 'add'} vehicles.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        ...formData,
        image: imageFile,
        status: vehicle?.status || 'available'
      });
      toast.success(`Vehicle ${vehicle ? 'updated' : 'added'} successfully`);
      onClose();
    } catch (error) {
      toast.error(`Failed to ${vehicle ? 'update' : 'add'} vehicle`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="VIN"
          value={formData.vin}
          onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
          required
        />
        <FormField
          label="Registration Number"
          value={formData.registrationNumber}
          onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
          required
        />
        <FormField
          label="Make"
          value={formData.make}
          onChange={(e) => setFormData({ ...formData, make: e.target.value })}
          required
        />
        <FormField
          label="Model"
          value={formData.model}
          onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          required
        />
        <FormField
          type="number"
          label="Year"
          value={formData.year}
          onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
          required
        />
        <FormField
          type="number"
          label="Mileage"
          value={formData.mileage}
          onChange={(e) => setFormData({ ...formData, mileage: parseInt(e.target.value) })}
          required
        />
        <FormField
          type="date"
          label="MOT Expiry"
          value={formData.motExpiry}
          onChange={(e) => setFormData({ ...formData, motExpiry: e.target.value })}
          required
        />
        <FormField
          type="date"
          label="Insurance Expiry"
          value={formData.insuranceExpiry}
          onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
          required
        />
        <FormField
          type="date"
          label="Road Tax Expiry"
          value={formData.roadTaxExpiry}
          onChange={(e) => setFormData({ ...formData, roadTaxExpiry: e.target.value })}
          required
        />
        <FormField
          type="date"
          label="NSL Expiry"
          value={formData.nslExpiry}
          onChange={(e) => setFormData({ ...formData, nslExpiry: e.target.value })}
          required
        />
        <FormField
          type="date"
          label="Last Maintenance"
          value={formData.lastMaintenance}
          onChange={(e) => setFormData({ ...formData, lastMaintenance: e.target.value })}
          required
        />
        <FormField
          type="date"
          label="Next Maintenance"
          value={formData.nextMaintenance}
          onChange={(e) => setFormData({ ...formData, nextMaintenance: e.target.value })}
          required
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Vehicle Image</label>
        <div className="mt-1 flex items-center">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Preview"
              className="h-32 w-32 object-cover rounded-md mr-4"
            />
          )}
          <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Upload className="h-5 w-5 mr-2 text-gray-400" />
            Upload Image
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
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
          {loading ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
        </button>
      </div>
    </form>
  );
};

export default VehicleForm;