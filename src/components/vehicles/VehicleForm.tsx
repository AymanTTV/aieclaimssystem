import React, { useState } from 'react';
import { Vehicle } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { formatInputDate, parseFormDate } from '../../utils/dateFormat';
import FormField from '../ui/FormField';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

interface VehicleFormProps {
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmit: (data: Partial<Vehicle>) => Promise<void>;
}
const DEFAULT_OWNER = {
  name: 'AIE Skyline',
  address: '',
  isDefault: true
};

const VehicleForm: React.FC<VehicleFormProps> = ({ vehicle, onClose, onSubmit }) => {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(vehicle?.image || null);
  const [owner, setOwner] = useState<VehicleOwner>(vehicle?.owner || DEFAULT_OWNER);
  const [isCustomOwner, setIsCustomOwner] = useState(!vehicle?.owner?.isDefault);

  const [formData, setFormData] = useState({
    vin: vehicle?.vin || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year?.toString() || new Date().getFullYear().toString(),
    registrationNumber: vehicle?.registrationNumber || '',
    mileage: vehicle?.mileage?.toString() || '0',
    motExpiry: formatInputDate(vehicle?.motExpiry),
    insuranceExpiry: formatInputDate(vehicle?.insuranceExpiry),
    roadTaxExpiry: formatInputDate(vehicle?.roadTaxExpiry),
    nslExpiry: formatInputDate(vehicle?.nslExpiry),
    lastMaintenance: formatInputDate(vehicle?.lastMaintenance),
    nextMaintenance: formatInputDate(vehicle?.nextMaintenance),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const vehicleData = {
        ...formData,
        owner: isCustomOwner ? owner : DEFAULT_OWNER,
        mileage: parseInt(formData.mileage),
        year: parseInt(formData.year),
        motExpiry: parseFormDate(formData.motExpiry),
        insuranceExpiry: parseFormDate(formData.insuranceExpiry),
        roadTaxExpiry: parseFormDate(formData.roadTaxExpiry),
        nslExpiry: parseFormDate(formData.nslExpiry),
        lastMaintenance: parseFormDate(formData.lastMaintenance),
        nextMaintenance: parseFormDate(formData.nextMaintenance),
        status: vehicle?.status || 'available',
        image: imageFile,
      };

      // Validate all dates are valid
      const dateFields = ['motExpiry', 'insuranceExpiry', 'roadTaxExpiry', 'nslExpiry', 'lastMaintenance', 'nextMaintenance'];
      const invalidDates = dateFields.filter(field => !vehicleData[field]);
      
      if (invalidDates.length > 0) {
        toast.error(`Invalid dates for: ${invalidDates.join(', ')}`);
        return;
      }

      await onSubmit(vehicleData);
      toast.success(`Vehicle ${vehicle ? 'updated' : 'added'} successfully`);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(`Failed to ${vehicle ? 'update' : 'add'} vehicle`);
    } finally {
      setLoading(false);
    }
  };

  if (!can('vehicles', vehicle ? 'update' : 'create')) {
    return <div>You don't have permission to {vehicle ? 'edit' : 'add'} vehicles.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Owner</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="customOwner"
              checked={isCustomOwner}
              onChange={(e) => {
                setIsCustomOwner(e.target.checked);
                if (!e.target.checked) {
                  setOwner(DEFAULT_OWNER);
                }
              }}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="customOwner" className="text-sm text-gray-700">
              Custom Owner
            </label>
          </div>

          {isCustomOwner ? (
            <div className="space-y-4">
              <FormField
                label="Owner Name"
                value={owner.name}
                onChange={(e) => setOwner({ ...owner, name: e.target.value, isDefault: false })}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700">Owner Address</label>
                <textarea
                  value={owner.address}
                  onChange={(e) => setOwner({ ...owner, address: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Default owner: {DEFAULT_OWNER.name}
            </div>
          )}
        </div>
      </div>
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
          onChange={(e) => setFormData({ ...formData, year: e.target.value })}
          required
        />

        <FormField
          type="number"
          label="Mileage"
          value={formData.mileage}
          onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
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

      <div>
        <label className="block text-sm font-medium text-gray-700">Vehicle Image</label>
        <div className="mt-1 flex items-center">
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Vehicle preview"
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
                  reader.onloadend = () => setImagePreview(reader.result as string);
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