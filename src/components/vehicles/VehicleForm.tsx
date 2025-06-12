// src/components/vehicles/VehicleForm.tsx
import React, { useState } from 'react';
import { Vehicle, DEFAULT_RENTAL_PRICES, DEFAULT_OWNER } from '../../types/vehicle';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Upload, X } from 'lucide-react';
import FormField from '../ui/FormField';
import { addMonths, parseISO } from 'date-fns';
import { validateImage, uploadImage } from '../../utils/imageUpload';
import toast from 'react-hot-toast';
import { Timestamp } from 'firebase/firestore';

interface VehicleFormProps {
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmit: (data: Partial<Vehicle>) => Promise<void>;
}

// Reusable hook for document images
function useDocumentManager(initialUrls: string[]) {
  const [existingUrls, setExistingUrls] = useState<string[]>([...initialUrls]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([...initialUrls]);

  const add = (files: FileList) => {
    const arr = Array.from(files).filter(validateImage);
    setNewFiles(n => [...n, ...arr]);
    arr.forEach(f => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews(p => [...p, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeAt = (idx: number) => {
    if (idx < existingUrls.length) {
      setExistingUrls(u => u.filter((_, i) => i !== idx));
    } else {
      const ni = idx - existingUrls.length;
      setNewFiles(n => n.filter((_, i) => i !== ni));
    }
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  return { existingUrls, newFiles, previews, add, removeAt };
}

const VehicleForm: React.FC<VehicleFormProps> = ({ vehicle, onClose, onSubmit }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | null>(vehicle?.image || null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  const [owner, setOwner] = useState<Vehicle['owner']>(vehicle?.owner || DEFAULT_OWNER);
  const [isCustomOwner, setIsCustomOwner] = useState(!vehicle?.owner?.isDefault);

  const nsl    = useDocumentManager(vehicle?.documents?.nslImage    || []);
  const mot    = useDocumentManager(vehicle?.documents?.motImage    || []);
  const v5doc  = useDocumentManager(vehicle?.documents?.v5Image     || []);
  const meter  = useDocumentManager(vehicle?.documents?.MeterCertificateImage || []);
  const insure = useDocumentManager(vehicle?.documents?.insuranceImage || []);

  const formatDateForInput = (t?: Timestamp|string|Date) => {
    if (!t) return '';
    const d = t instanceof Timestamp ? t.toDate() : (typeof t==='string' ? new Date(t) : t);
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime()-off).toISOString().slice(0,10);
  };

  const [formData, setFormData] = useState({
    vin: vehicle?.vin || '',
    make: vehicle?.make || '',
    model: vehicle?.model || '',
    year: vehicle?.year.toString() || new Date().getFullYear().toString(),
    registrationNumber: vehicle?.registrationNumber || '',
    mileage: vehicle?.mileage.toString() || '0',
    insuranceExpiry: formatDateForInput(vehicle?.insuranceExpiry),
    motTestDate:    formatDateForInput(vehicle?.motTestDate),
    nslExpiry:      formatDateForInput(vehicle?.nslExpiry),
    roadTaxExpiry:  formatDateForInput(vehicle?.roadTaxExpiry),
    lastMaintenance:formatDateForInput(vehicle?.lastMaintenance),
    nextMaintenance:formatDateForInput(vehicle?.nextMaintenance),
    weeklyRentalPrice: vehicle?.weeklyRentalPrice.toString() || DEFAULT_RENTAL_PRICES.weekly.toString(),
    dailyRentalPrice:  vehicle?.dailyRentalPrice.toString()  || DEFAULT_RENTAL_PRICES.daily.toString(),
    claimRentalPrice:  vehicle?.claimRentalPrice.toString()  || DEFAULT_RENTAL_PRICES.claim.toString(),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !validateImage(f)) return;
    setNewImageFile(f);
    const r = new FileReader();
    r.onloadend = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return;
    setLoading(true);
    try {
      const uploadBatch = async (files: File[], base: string[]) => {
        const out = [...base];
        for (let f of files) out.push(await uploadImage(f,'vehicle-documents'));
        return out;
      };
      const [nslUrls, motUrls, v5Urls, meterUrls, insUrls] = await Promise.all([
        uploadBatch(nsl.newFiles,    nsl.existingUrls),
        uploadBatch(mot.newFiles,    mot.existingUrls),
        uploadBatch(v5doc.newFiles,  v5doc.existingUrls),
        uploadBatch(meter.newFiles,  meter.existingUrls),
        uploadBatch(insure.newFiles, insure.existingUrls),
      ]);

      const motDate = formData.motTestDate ? parseISO(formData.motTestDate) : undefined;
      const motExpiry = motDate ? addMonths(motDate,6) : undefined;

      const payload: Partial<Vehicle> = {
        vin: formData.vin,
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year,10),
        registrationNumber: formData.registrationNumber,
        mileage: parseInt(formData.mileage,10),
        insuranceExpiry: formData.insuranceExpiry ? parseISO(formData.insuranceExpiry) : undefined,
        motTestDate: motDate,
        motExpiry,
        nslExpiry: formData.nslExpiry ? parseISO(formData.nslExpiry) : undefined,
        roadTaxExpiry: formData.roadTaxExpiry ? parseISO(formData.roadTaxExpiry) : undefined,
        lastMaintenance: formData.lastMaintenance ? parseISO(formData.lastMaintenance) : undefined,
        nextMaintenance: formData.nextMaintenance ? parseISO(formData.nextMaintenance) : undefined,
        weeklyRentalPrice: Math.round(parseFloat(formData.weeklyRentalPrice)),
        dailyRentalPrice:  Math.round(parseFloat(formData.dailyRentalPrice)),
        claimRentalPrice:  Math.round(parseFloat(formData.claimRentalPrice)),
        owner: isCustomOwner ? owner : DEFAULT_OWNER,
        updatedAt: new Date(),
        documents: {
          nslImage: nslUrls,
          motImage: motUrls,
          v5Image: v5Urls,
          MeterCertificateImage: meterUrls,
          insuranceImage: insUrls,
        }
      };

      if (newImageFile) payload.image = await uploadImage(newImageFile,'vehicle-main');
      await onSubmit(payload);
      toast.success(vehicle ? 'Vehicle updated successfully' : 'Vehicle added successfully');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save vehicle');
    } finally { setLoading(false); }
  };

  if (!can('vehicles', vehicle ? 'update' : 'create')) {
    return <div>You don’t have permission to {vehicle ? 'edit' : 'add'} vehicles.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">  
      {/* BASIC INFO */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="VIN" value={formData.vin} onChange={e=>setFormData({...formData,vin:e.target.value})} required />
        <FormField label="Registration Number" value={formData.registrationNumber} onChange={e=>setFormData({...formData,registrationNumber:e.target.value})} required />
        <FormField label="Make"           value={formData.make} onChange={e=>setFormData({...formData,make:e.target.value})} required />
        <FormField label="Model"          value={formData.model} onChange={e=>setFormData({...formData,model:e.target.value})} required />
        <FormField type="number" label="Year"    value={formData.year}    onChange={e=>setFormData({...formData,year:e.target.value})} required />
        <FormField type="number" label="Mileage" value={formData.mileage} onChange={e=>setFormData({...formData,mileage:e.target.value})} required />
      </div>

      {/* RENTAL PRICING */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Pricing</h3>
        <div className="grid grid-cols-3 gap-4">
          <FormField type="number" label="Weekly (£)" value={formData.weeklyRentalPrice} onChange={e=>setFormData({...formData,weeklyRentalPrice:e.target.value})} min="0" step="1" required />
          <FormField type="number" label="Daily (£)"  value={formData.dailyRentalPrice}  onChange={e=>setFormData({...formData,dailyRentalPrice:e.target.value})}  min="0" step="1" required />
          <FormField type="number" label="Claim (£)"  value={formData.claimRentalPrice}  onChange={e=>setFormData({...formData,claimRentalPrice:e.target.value})}  min="0" step="1" required />
        </div>
      </div>

      {/* OWNER */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Owner</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={isCustomOwner} onChange={e=>{setIsCustomOwner(e.target.checked);if(!e.target.checked)setOwner(DEFAULT_OWNER)}} className="rounded border-gray-300 text-primary focus:ring-primary" />
            <span>Custom Owner</span>
          </label>
          {isCustomOwner ? (
            <div className="space-y-4">
              <FormField label="Owner Name" value={owner.name} onChange={e=>setOwner({...owner,name:e.target.value,isDefault:false})} required />
              <div>
                <label className="block text-sm font-medium text-gray-700">Owner Address</label>
                <textarea rows={3} value={owner.address} onChange={e=>setOwner({...owner,address:e.target.value})} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" required />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Default: {DEFAULT_OWNER.name}, {DEFAULT_OWNER.address}</p>
          )}
        </div>
      </div>

      {/* DATES */}
      <div className="grid grid-cols-2 gap-4">
        <FormField type="date" label="MOT Test Date"    value={formData.motTestDate}    onChange={e=>setFormData({...formData,motTestDate:e.target.value})}    required />
        <FormField type="date" label="NSL Expiry"        value={formData.nslExpiry}        onChange={e=>setFormData({...formData,nslExpiry:e.target.value})}        required />
        <FormField type="date" label="Road Tax Expiry"   value={formData.roadTaxExpiry}    onChange={e=>setFormData({...formData,roadTaxExpiry:e.target.value})}   required />
        <FormField type="date" label="Insurance Expiry"  value={formData.insuranceExpiry}  onChange={e=>setFormData({...formData,insuranceExpiry:e.target.value})}  required />
        <FormField type="date" label="Last Maintenance"  value={formData.lastMaintenance}  onChange={e=>setFormData({...formData,lastMaintenance:e.target.value})}  required />
        <FormField type="date" label="Next Maintenance"  value={formData.nextMaintenance}  onChange={e=>setFormData({...formData,nextMaintenance:e.target.value})}  required />
      </div>

      {/* MAIN IMAGE */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Vehicle Image</label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            {imagePreview
              ? <img src={imagePreview} alt="Vehicle preview" className="mx-auto h-32 w-auto object-cover rounded-md" />
              : <Upload className="mx-auto h-12 w-12 text-gray-400" />
            }
            <div className="flex text-sm text-gray-600">
              <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                <span>Upload a photo</span>
                <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, WebP up to 100 MB</p>
          </div>
        </div>
      </div>

      {/* DOCUMENTS BLOCKS */}
      {[
        { title: 'NSL Images', dt: nsl },
        { title: 'MOT Images', dt: mot },
        { title: 'V5 Images', dt: v5doc },
        { title: 'Meter Certificate Images', dt: meter },
        { title: 'Insurance Images', dt: insure },
      ].map(({ title, dt }) => (
        <div key={title} className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
          {dt.previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {dt.previews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt={`${title} ${i+1}`} className="h-24 w-full object-cover rounded-md" />
                  <button type="button" onClick={()=>dt.removeAt(i)} className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200">
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
                  <span>Upload {title}</span>
                  <input type="file" className="sr-only" accept="image/*" multiple onChange={e=>dt.add(e.target.files!)} />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, WebP up to 100 MB</p>
            </div>
          </div>
        </div>
      ))}

      {/* ACTIONS */}
      <div className="flex justify-end space-x-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600">
          {loading ? (vehicle ? 'Updating...' : 'Saving...') : (vehicle ? 'Update Vehicle' : 'Add Vehicle')}
        </button>
      </div>
    </form>
  );
};

export default VehicleForm;
