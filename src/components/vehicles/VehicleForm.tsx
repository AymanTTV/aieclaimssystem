import React, { useState } from 'react';
import { Vehicle, DEFAULT_RENTAL_PRICES, DEFAULT_OWNER } from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { validateImage } from '../../utils/imageUpload';
import { Upload } from 'lucide-react';
import FormField from '../ui/FormField';
import toast from 'react-hot-toast';

interface VehicleFormProps {
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmit: (data: Partial<Vehicle>) => Promise<void>;  // Add this prop
}

const VehicleForm: React.FC<VehicleFormProps> = ({ vehicle, onClose, onSubmit }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(vehicle?.image || null);
  const [owner, setOwner] = useState<Vehicle['owner']>(vehicle?.owner || DEFAULT_OWNER);
  const [isCustomOwner, setIsCustomOwner] = useState(!vehicle?.owner?.isDefault);

  const [formData, setFormData] = useState({
    vin: vehicle?.vin || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year?.toString() || new Date().getFullYear().toString(),
    registrationNumber: vehicle?.registrationNumber || '',
    mileage: vehicle?.mileage?.toString() || '0',
    insuranceExpiry: vehicle?.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toISOString().split('T')[0] : '',
    motTestDate: vehicle?.motTestDate ? new Date(vehicle.motTestDate).toISOString().split('T')[0] : '',
    nslExpiry: vehicle?.nslExpiry ? new Date(vehicle.nslExpiry).toISOString().split('T')[0] : '',
    roadTaxExpiry: vehicle?.roadTaxExpiry ? new Date(vehicle.roadTaxExpiry).toISOString().split('T')[0] : '',
    lastMaintenance: vehicle?.lastMaintenance ? new Date(vehicle.lastMaintenance).toISOString().split('T')[0] : '',
    nextMaintenance: vehicle?.nextMaintenance ? new Date(vehicle.nextMaintenance).toISOString().split('T')[0] : '',
    image: null as File | null,
    weeklyRentalPrice: vehicle?.weeklyRentalPrice?.toString() || DEFAULT_RENTAL_PRICES.weekly.toString(),
    dailyRentalPrice: vehicle?.dailyRentalPrice?.toString() || DEFAULT_RENTAL_PRICES.daily.toString(),
    claimRentalPrice: vehicle?.claimRentalPrice?.toString() || DEFAULT_RENTAL_PRICES.claim.toString(),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImage(file)) {
      return;
    }

    setFormData({ ...formData, image: file });
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateDocument = async (record: Vehicle) => {
    try {
      const documentUrl = await generateAndUploadDocument(
        VehicleDocument,
        record,
        'vehicles',
        record.id,
        'vehicles'
      );
      
      toast.success('Document generated successfully');
      return documentUrl;
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const motTestDate = new Date(formData.motTestDate);
      const motExpiry = new Date(motTestDate);
      motExpiry.setMonth(motExpiry.getMonth() + 6); // Add 6 months to test date

      const vehicleData = {
        ...formData,
        mileage: parseInt(formData.mileage),
        year: parseInt(formData.year),
        motTestDate: new Date(formData.motTestDate),
        motExpiry,
        nslExpiry: new Date(formData.nslExpiry),
        roadTaxExpiry: new Date(formData.roadTaxExpiry),
        insuranceExpiry: new Date(formData.insuranceExpiry),
        lastMaintenance: new Date(formData.lastMaintenance),
        nextMaintenance: new Date(formData.nextMaintenance),
        weeklyRentalPrice: Math.round(parseFloat(formData.weeklyRentalPrice)) || DEFAULT_RENTAL_PRICES.weekly,
        dailyRentalPrice: Math.round(parseFloat(formData.dailyRentalPrice)) || DEFAULT_RENTAL_PRICES.daily,
        claimRentalPrice: Math.round(parseFloat(formData.claimRentalPrice)) || DEFAULT_RENTAL_PRICES.claim,
        owner: isCustomOwner ? owner : DEFAULT_OWNER,
        status: vehicle?.status || 'available',
        image: formData.image,
        createdBy: user.id,
      };

      await onSubmit(vehicleData);
      onClose();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  if (!can('vehicles', vehicle ? 'update' : 'create')) {
    return <div>You don't have permission to {vehicle ? 'edit' : 'add'} vehicles.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Vehicle Information */}
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
      </div>

      {/* Rental Pricing Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Pricing</h3>
        <div className="grid grid-cols-3 gap-4">
          <FormField
            type="number"
            label="Weekly Rental Price (£)"
            value={formData.weeklyRentalPrice}
            onChange={(e) => setFormData({ ...formData, weeklyRentalPrice: e.target.value })}
            min="0"
            step="1"
            required
          />
          <FormField
            type="number"
            label="Daily Rental Price (£)"
            value={formData.dailyRentalPrice}
            onChange={(e) => setFormData({ ...formData, dailyRentalPrice: e.target.value })}
            min="0"
            step="1"
            required
          />
          <FormField
            type="number"
            label="Claim Rental Price (£)"
            value={formData.claimRentalPrice}
            onChange={(e) => setFormData({ ...formData, claimRentalPrice: e.target.value })}
            min="0"
            step="1"
            required
          />
        </div>
      </div>

      {/* Owner Information */}
      <div className="border-t pt-6">
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
              <br />
              Address: {DEFAULT_OWNER.address}
            </div>
          )}
        </div>
      </div>

      {/* Document Expiry Dates */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="MOT Test Date"
          value={formData.motTestDate}
          onChange={(e) => setFormData({ ...formData, motTestDate: e.target.value })}
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
          label="Road Tax Expiry"
          value={formData.roadTaxExpiry}
          onChange={(e) => setFormData({ ...formData, roadTaxExpiry: e.target.value })}
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

      {/* Vehicle Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Vehicle Image</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Vehicle preview"
                className="mx-auto h-32 w-auto object-cover rounded-md"
              />
            ) : (
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                <span>Upload a photo</span>
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, WebP up to 100 MB</p>
          </div>
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