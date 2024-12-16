import React, { useState } from 'react';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Vehicle, VehicleOwner } from '../../types';
import { Upload } from 'lucide-react';
import FormField from '../ui/FormField';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { formatDateForInput } from '../../utils/dateHelpers';

interface VehicleFormProps {
  vehicle?: Partial<Vehicle>;
  onClose: () => void;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ vehicle, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(vehicle?.image || null);

  const [formData, setFormData] = useState({
    vin: vehicle?.vin || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year || new Date().getFullYear(),
    registrationNumber: vehicle?.registrationNumber || '',
    status: vehicle?.status || 'active',
    mileage: vehicle?.mileage || 0,
    insuranceExpiry: formatDateForInput(vehicle?.insuranceExpiry),
    motExpiry: formatDateForInput(vehicle?.motExpiry),
    nslExpiry: formatDateForInput(vehicle?.nslExpiry),
    roadTaxExpiry: formatDateForInput(vehicle?.roadTaxExpiry),
    lastMaintenance: formatDateForInput(vehicle?.lastMaintenance),
    nextMaintenance: formatDateForInput(vehicle?.nextMaintenance),
  });

  const [ownerData, setOwnerData] = useState<VehicleOwner>({
    fullName: vehicle?.owner?.fullName || '',
    address: vehicle?.owner?.address || '',
    email: vehicle?.owner?.email || '',
    phoneNumber: vehicle?.owner?.phoneNumber || '',
  });

  const [saleData, setSaleData] = useState({
    salePrice: vehicle?.salePrice || '',
    soldDate: vehicle?.soldDate ? formatDateForInput(vehicle.soldDate) : formatDateForInput(new Date()),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let imageUrl = vehicle?.image || '';
      if (imageFile) {
        const imageRef = ref(storage, `vehicles/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const vehicleData = {
        ...formData,
        image: imageUrl,
        owner: ownerData,
        insuranceExpiry: new Date(formData.insuranceExpiry),
        motExpiry: new Date(formData.motExpiry),
        nslExpiry: new Date(formData.nslExpiry),
        roadTaxExpiry: new Date(formData.roadTaxExpiry),
        lastMaintenance: new Date(formData.lastMaintenance),
        nextMaintenance: new Date(formData.nextMaintenance),
        ...(formData.status === 'sold' && {
          salePrice: parseFloat(saleData.salePrice),
          soldDate: new Date(saleData.soldDate)
        }),
        updatedAt: new Date(),
      };

      if (vehicle?.id) {
        await updateDoc(doc(db, 'vehicles', vehicle.id), vehicleData);
        toast.success('Vehicle updated successfully');
      } else {
        await addDoc(collection(db, 'vehicles'), {
          ...vehicleData,
          createdAt: new Date(),
          createdBy: user.id,
        });
        toast.success('Vehicle added successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Vehicle Image</label>
        <div className="mt-1 flex items-center space-x-4">
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="h-32 w-32 object-cover rounded-lg" />
          ) : (
            <div className="h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Upload Image
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>
        </div>
      </div>

      {/* Basic Information */}
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
      </div>

      {/* Owner Information */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Owner Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Full Name"
            value={ownerData.fullName}
            onChange={(e) => setOwnerData({ ...ownerData, fullName: e.target.value })}
            required
          />
          <FormField
            type="email"
            label="Email"
            value={ownerData.email}
            onChange={(e) => setOwnerData({ ...ownerData, email: e.target.value })}
            required
          />
          <FormField
            type="tel"
            label="Phone Number"
            value={ownerData.phoneNumber}
            onChange={(e) => setOwnerData({ ...ownerData, phoneNumber: e.target.value })}
            required
          />
          <div className="col-span-2">
            <FormField
              label="Address"
              value={ownerData.address}
              onChange={(e) => setOwnerData({ ...ownerData, address: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="active">Active</option>
          <option value="maintenance">Maintenance</option>
          <option value="rented">Rented</option>
          <option value="claim">In Claim</option>
          <option value="unavailable">Unavailable</option>
          <option value="sold">Sold</option>
        </select>
      </div>

      {/* Sale Information (if status is sold) */}
      {formData.status === 'sold' && (
        <div className="space-y-4">
          <FormField
            type="number"
            label="Sale Price"
            value={saleData.salePrice}
            onChange={(e) => setSaleData({ ...saleData, salePrice: e.target.value })}
            required
            min="0"
            step="0.01"
          />
          <FormField
            type="date"
            label="Sale Date"
            value={saleData.soldDate}
            onChange={(e) => setSaleData({ ...saleData, soldDate: e.target.value })}
            required
          />
        </div>
      )}

      {/* Document Expiry Dates */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="MOT Expiry"
          value={formData.motExpiry}
          onChange={(e) => setFormData({ ...formData, motExpiry: e.target.value })}
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

      {/* Submit Buttons */}
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
          {loading ? 'Saving...' : vehicle?.id ? 'Update Vehicle' : 'Add Vehicle'}
        </button>
      </div>
    </form>
  );
};

export default VehicleForm;