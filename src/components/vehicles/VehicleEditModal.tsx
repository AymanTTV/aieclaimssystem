import React, { useState } from 'react';
import { Vehicle, DEFAULT_RENTAL_PRICES, DEFAULT_OWNER } from '../../types/vehicle';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { Upload, X } from 'lucide-react';
import FormField from '../ui/FormField';
import { validateImage } from '../../utils/imageUpload';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';

interface VehicleEditModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleEditModal: React.FC<VehicleEditModalProps> = ({ vehicle, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(vehicle.image || null);
  const [owner, setOwner] = useState<Vehicle['owner']>(vehicle.owner || DEFAULT_OWNER);
  const [isCustomOwner, setIsCustomOwner] = useState(!vehicle.owner?.isDefault);
  
  // Document images
  const [nslImages, setNslImages] = useState<File[]>([]);
  const [motImages, setMotImages] = useState<File[]>([]);
  const [v5Images, setV5Images] = useState<File[]>([]);
  const [insuranceImages, setInsuranceImages] = useState<File[]>([]);
  // Document images
  const [MeterCertificateImages, setMeterCertificateImages] = useState<File[]>([]);

// Document image previews
const [MeterCertificateImagePreviews, setMeterCertificateImagePreviews] = useState<string[]>(vehicle.documents?.MeterCertificateImage || []);
  // Document image previews
  const [nslImagePreviews, setNslImagePreviews] = useState<string[]>(vehicle.documents?.nslImage || []);
  const [motImagePreviews, setMotImagePreviews] = useState<string[]>(vehicle.documents?.motImage || []);
  const [v5ImagePreviews, setV5ImagePreviews] = useState<string[]>(vehicle.documents?.v5Image || []);
  const [insuranceImagePreviews, setInsuranceImagePreviews] = useState<string[]>(vehicle.documents?.insuranceImage || []);
  
  const [formData, setFormData] = useState({
    vin: vehicle.vin || '',
    make: vehicle.make || '',
    model: vehicle.model || '',
    year: vehicle.year?.toString() || new Date().getFullYear().toString(),
    registrationNumber: vehicle.registrationNumber || '',
    mileage: vehicle.mileage?.toString() || '0',
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
  
  const handleDocumentImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'nsl' | 'mot' | 'v5' | 'MeterCertificateImage' | 'insurance') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Convert FileList to array
    const fileArray = Array.from(files);
    
    // Validate each file
    const validFiles = fileArray.filter(file => validateImage(file));
    
    if (validFiles.length === 0) return;
    
    // Update state based on document type
    switch (type) {
      case 'nsl':
        setNslImages(prevImages => [...prevImages, ...validFiles]);
        // Create previews
        fileArray.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setNslImagePreviews(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        });
        break;
      case 'mot':
        setMotImages(prevImages => [...prevImages, ...validFiles]);
        // Create previews
        fileArray.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setMotImagePreviews(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        });
        break;
      case 'v5':
        setV5Images(prevImages => [...prevImages, ...validFiles]);
        // Create previews
        fileArray.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setV5ImagePreviews(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        });
        break;
        case 'MeterCertificateImage':
          setMeterCertificateImages(prevImages => [...prevImages, ...validFiles]);
          fileArray.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
              setMeterCertificateImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
          });
          break;
      case 'insurance':
        setInsuranceImages(prevImages => [...prevImages, ...validFiles]);
        // Create previews
        fileArray.forEach(file => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setInsuranceImagePreviews(prev => [...prev, reader.result as string]);
          };
          reader.readAsDataURL(file);
        });
        break;
    }
  };
  
  const removeDocumentPreview = (type: 'nsl' | 'mot' | 'v5' | 'MeterCertificateImage' | 'insurance', index: number) => {
    switch (type) {
      case 'nsl':
        setNslImagePreviews(prev => prev.filter((_, i) => i !== index));
        setNslImages(prev => prev.filter((_, i) => i !== index));
        break;
      case 'mot':
        setMotImagePreviews(prev => prev.filter((_, i) => i !== index));
        setMotImages(prev => prev.filter((_, i) => i !== index));
        break;
      case 'v5':
        setV5ImagePreviews(prev => prev.filter((_, i) => i !== index));
        setV5Images(prev => prev.filter((_, i) => i !== index));
        break;
      case 'MeterCertificateImage':
        setMeterCertificateImagePreviews(prev => prev.filter((_, i) => i !== index));
        setMeterCertificateImages(prev => prev.filter((_, i) => i !== index));
        break;
      case 'insurance':
        setInsuranceImagePreviews(prev => prev.filter((_, i) => i !== index));
        setInsuranceImages(prev => prev.filter((_, i) => i !== index));
        break;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = vehicle.image || '';

      if (formData.image) {
        const imageRef = ref(storage, `vehicles/${Date.now()}_${formData.image.name}`);
        const snapshot = await uploadBytes(imageRef, formData.image);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      // Calculate MOT expiry date (6 months after test date)
      const motTestDate = new Date(formData.motTestDate);
      const motExpiry = new Date(motTestDate);
      motExpiry.setMonth(motExpiry.getMonth() + 6);
      
      // Upload document images and get URLs
      const uploadDocumentImages = async (files: File[], existingUrls: string[]): Promise<string[]> => {
        const urls = [...existingUrls];
        
        for (const file of files) {
          const imageRef = ref(storage, `vehicle-documents/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(imageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          urls.push(url);
        }
        
        return urls;
      };
      
      // Upload all document images
  const [nslUrls, motUrls, v5Urls, insuranceUrls, meterCertificateUrls] = await Promise.all([
    uploadDocumentImages(nslImages, vehicle.documents?.nslImage || []),
    uploadDocumentImages(motImages, vehicle.documents?.motImage || []),
    uploadDocumentImages(v5Images, vehicle.documents?.v5Image || []),
    uploadDocumentImages(insuranceImages, vehicle.documents?.insuranceImage || []),
    uploadDocumentImages(MeterCertificateImages, vehicle.documents?.MeterCertificateImage || [])
  ]);

      const vehicleData = {
        ...formData,
        image: imageUrl,
        mileage: parseInt(formData.mileage),
        year: parseInt(formData.year),
        motTestDate: new Date(formData.motTestDate),
        motExpiry, // Add calculated MOT expiry
        nslExpiry: new Date(formData.nslExpiry),
        roadTaxExpiry: new Date(formData.roadTaxExpiry),
        insuranceExpiry: new Date(formData.insuranceExpiry),
        lastMaintenance: new Date(formData.lastMaintenance),
        nextMaintenance: new Date(formData.nextMaintenance),
        weeklyRentalPrice: Math.round(parseFloat(formData.weeklyRentalPrice)) || DEFAULT_RENTAL_PRICES.weekly,
        dailyRentalPrice: Math.round(parseFloat(formData.dailyRentalPrice)) || DEFAULT_RENTAL_PRICES.daily,
        claimRentalPrice: Math.round(parseFloat(formData.claimRentalPrice)) || DEFAULT_RENTAL_PRICES.claim,
        owner: isCustomOwner ? owner : DEFAULT_OWNER,
        updatedAt: new Date(),
        documents: {
          ...(vehicle.documents || {}),
          nslImage: nslUrls,
          motImage: motUrls,
          v5Image: v5Urls,
          insuranceImage: insuranceUrls,
          MeterCertificateImage: meterCertificateUrls
        }
      };

      await updateDoc(doc(db, 'vehicles', vehicle.id), vehicleData);
      toast.success('Vehicle updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      toast.error('Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Vehicle"
      size="xl"
    >
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
              <p className="text-xs text-gray-500">PNG, JPG, WebP up to 5MB</p>
            </div>
          </div>
        </div>
        
        {/* Document Images */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Document Images</h3>
          
          {/* NSL Images */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">NSL Images</label>
            {nslImagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {nslImagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={preview} 
                      alt={`NSL document ${index + 1}`} 
                      className="h-24 w-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeDocumentPreview('nsl', index)}
                      className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                    <span>Upload NSL images</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleDocumentImageChange(e, 'nsl')}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, WebP up to 100 MB</p>
              </div>
            </div>
          </div>
          
          {/* MOT Images */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">MOT Images</label>
            {motImagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {motImagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={preview} 
                      alt={`MOT document ${index + 1}`} 
                      className="h-24 w-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeDocumentPreview('mot', index)}
                      className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                    <span>Upload MOT images</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleDocumentImageChange(e, 'mot')}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, WebP up to 100 MB</p>
              </div>
            </div>
          </div>
          
          {/* V5 Images */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">V5 Images</label>
            {v5ImagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {v5ImagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={preview} 
                      alt={`V5 document ${index + 1}`} 
                      className="h-24 w-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeDocumentPreview('v5', index)}
                      className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                    <span>Upload V5 images</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleDocumentImageChange(e, 'v5')}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, WebP up to 100 MB</p>
              </div>
            </div>
          </div>

          {/* MeterCertificateImage Images */}
<div className="mb-6">
  <label className="block text-sm font-medium text-gray-700 mb-2">Meter Certificate Images</label>
  {MeterCertificateImagePreviews.length > 0 && (
    <div className="grid grid-cols-3 gap-2 mb-2">
      {MeterCertificateImagePreviews.map((preview, index) => (
        <div key={index} className="relative">
          <img
            src={preview}
            alt={`Meter Certificate Image document ${index + 1}`}
            className="h-24 w-full object-cover rounded-md"
          />
          <button
            type="button"
            onClick={() => removeDocumentPreview('MeterCertificateImage', index)}
            className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
          >
            <X className="h-4 w-4 text-red-600" />
          </button>
        </div>
      ))}
    </div>
  )}
  <div className="flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
    <div className="space-y-1 text-center">
      <Upload className="mx-auto h-8 w-8 text-gray-400" />
      <div className="flex text-sm text-gray-600">
        <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
          <span>Upload Meter Certificate images</span>
          <input
            type="file"
            className="sr-only"
            accept="image/*"
            multiple
            onChange={(e) => handleDocumentImageChange(e, 'MeterCertificateImage')}
          />
        </label>
        <p className="pl-1">or drag and drop</p>
      </div>
      <p className="text-xs text-gray-500">PNG, JPG, WebP up to 100 MB</p>
    </div>
  </div>
</div>
          
          {/* Insurance Images */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Images</label>
            {insuranceImagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {insuranceImagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img 
                      src={preview} 
                      alt={`Insurance document ${index + 1}`} 
                      className="h-24 w-full object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => removeDocumentPreview('insurance', index)}
                      className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                    <span>Upload Insurance images</span>
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleDocumentImageChange(e, 'insurance')}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, WebP up to 100 MB</p>
              </div>
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
    </Modal>
  );
};

export default VehicleEditModal;