import React, { useState } from 'react';
import { Vehicle } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { Upload } from 'lucide-react';
import FormField from '../ui/FormField';
import { formatDateForInput } from '../../utils/dateHelpers';
import toast from 'react-hot-toast';

interface VehicleEditModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleEditModal: React.FC<VehicleEditModalProps> = ({ vehicle, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(vehicle.image || null);
  const [formData, setFormData] = useState({
  vin: vehicle?.vin || '',
  make: vehicle?.make || '',
  model: vehicle?.model || '',
  year: vehicle?.year?.toString() || new Date().getFullYear().toString(),
  registrationNumber: vehicle?.registrationNumber || '',
  mileage: vehicle?.mileage?.toString() || '0',
  insuranceExpiry: vehicle?.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toISOString().split('T')[0] : '',
  motExpiry: vehicle?.motExpiry ? new Date(vehicle.motExpiry).toISOString().split('T')[0] : '',
  nslExpiry: vehicle?.nslExpiry ? new Date(vehicle.nslExpiry).toISOString().split('T')[0] : '',
  roadTaxExpiry: vehicle?.roadTaxExpiry ? new Date(vehicle.roadTaxExpiry).toISOString().split('T')[0] : '',
  lastMaintenance: vehicle?.lastMaintenance ? new Date(vehicle.lastMaintenance).toISOString().split('T')[0] : '',
  nextMaintenance: vehicle?.nextMaintenance ? new Date(vehicle.nextMaintenance).toISOString().split('T')[0] : '',
  image: null as File | null,
});



  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormData({ ...formData, image: file });
    
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
    
    if (formData.image) {
      const imageRef = ref(storage, `vehicles/${Date.now()}_${formData.image.name}`);
      const snapshot = await uploadBytes(imageRef, formData.image);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    const vehicleData = {
      ...formData,
      image: imageUrl,
      status: vehicle?.status || 'available', // Preserve existing status or set default for new vehicles
      mileage: parseInt(formData.mileage.toString()),
      year: parseInt(formData.year.toString()),
      insuranceExpiry: new Date(formData.insuranceExpiry),
      motExpiry: new Date(formData.motExpiry),
      nslExpiry: new Date(formData.nslExpiry),
      roadTaxExpiry: new Date(formData.roadTaxExpiry),
      lastMaintenance: new Date(formData.lastMaintenance),
      nextMaintenance: new Date(formData.nextMaintenance),
      updatedAt: new Date()
    };

    if (vehicle) {
      await updateDoc(doc(db, 'vehicles', vehicle.id), vehicleData);
    } else {
      await addDoc(collection(db, 'vehicles'), {
        ...vehicleData,
        createdAt: new Date(),
        createdBy: user.id,
      });
    }

    toast.success(`Vehicle ${vehicle ? 'updated' : 'added'} successfully`);
    onClose();
  } catch (error) {
    console.error('Error saving vehicle:', error);
    toast.error(`Failed to ${vehicle ? 'update' : 'add'} vehicle`);
  } finally {
    setLoading(false);
  }
};



  // Add this function inside the VehicleForm component
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <div>
  <label className="block text-sm font-medium text-gray-700">Status</label>
  <select
    value={formData.status}
    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
  >
    <option value="available">Available</option>
    <option value="maintenance">Maintenance</option>
    <option value="rented">Rented</option>
    <option value="claim">In Claim</option>
    <option value="unavailable">Unavailable</option>
    <option value="sold">Sold</option>
  </select>
</div>


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
            <p className="text-xs text-gray-500">PNG, JPG, WebP up to 5MB</p>
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
          {loading ? 'Updating...' : 'Update Vehicle'}
        </button>
      </div>
    </form>
  );
};

export default VehicleEditModal;