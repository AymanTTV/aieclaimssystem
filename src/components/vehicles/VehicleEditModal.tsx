// src/components/vehicles/VehicleEditModal.tsx
import React, { useState } from 'react';
import { Vehicle, DEFAULT_OWNER } from '../../types/vehicle';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { validateImage, uploadImage } from '../../utils/imageUpload';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import FormField from '../ui/FormField';
import { Upload, X } from 'lucide-react';

interface VehicleEditModalProps {
  vehicle: Vehicle;
  onClose: () => void;
}

export const VehicleEditModal: React.FC<VehicleEditModalProps> = ({
  vehicle,
  onClose,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // --- Basic fields ---
  const [formData, setFormData] = useState({
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year.toString(),
    registrationNumber: vehicle.registrationNumber,
    mileage: vehicle.mileage.toString(),
    motTestDate: vehicle.motTestDate
      ? new Date(vehicle.motTestDate).toISOString().split('T')[0]
      : '',
    nslExpiry: vehicle.nslExpiry
      ? new Date(vehicle.nslExpiry).toISOString().split('T')[0]
      : '',
    roadTaxExpiry: vehicle.roadTaxExpiry
      ? new Date(vehicle.roadTaxExpiry).toISOString().split('T')[0]
      : '',
    insuranceExpiry: vehicle.insuranceExpiry
      ? new Date(vehicle.insuranceExpiry).toISOString().split('T')[0]
      : '',
    lastMaintenance: vehicle.lastMaintenance
      ? new Date(vehicle.lastMaintenance).toISOString().split('T')[0]
      : '',
    nextMaintenance: vehicle.nextMaintenance
      ? new Date(vehicle.nextMaintenance).toISOString().split('T')[0]
      : '',
    weeklyRentalPrice: vehicle.weeklyRentalPrice.toString(),
    dailyRentalPrice: vehicle.dailyRentalPrice.toString(),
    claimRentalPrice: vehicle.claimRentalPrice.toString(),
  });

  // --- Owner logic ---
  const [owner, setOwner] = useState<Vehicle['owner']>(
    vehicle.owner || DEFAULT_OWNER
  );
  const [isCustomOwner, setIsCustomOwner] = useState(
    !vehicle.owner?.isDefault
  );

  // --- Main image ---
  const [imagePreview, setImagePreview] = useState<string | null>(
    vehicle.image || null
  );
  const [newMainImage, setNewMainImage] = useState<File | null>(null);
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !validateImage(f)) return;
    setNewMainImage(f);
    const r = new FileReader();
    r.onload = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  // --- Document‐type helper factory ---
  function useDoc(key: keyof Vehicle['documents']) {
    const existing = vehicle.documents?.[key] || [];
    const [existingUrls, setExistingUrls] = useState<string[]>([...existing]);
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([...existing]);

    const onAdd = (files: FileList) => {
      const arr = Array.from(files).filter(validateImage);
      arr.forEach((f) => {
        const r = new FileReader();
        r.onload = () => setPreviews((p) => [...p, r.result as string]);
        r.readAsDataURL(f);
      });
      setNewFiles((n) => [...n, ...arr]);
    };

    const onRemove = (idx: number) => {
      if (idx < existingUrls.length) {
        setExistingUrls((u) => u.filter((_, i) => i !== idx));
      } else {
        const ni = idx - existingUrls.length;
        setNewFiles((n) => n.filter((_, i) => i !== ni));
      }
      setPreviews((p) => p.filter((_, i) => i !== idx));
    };

    return { existingUrls, newFiles, previews, onAdd, onRemove };
  }

  const nsl    = useDoc('nslImage');
  const mot    = useDoc('motImage');
  const v5doc  = useDoc('v5Image');
  const meter  = useDoc('MeterCertificateImage');
  const insure = useDoc('insuranceImage');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1) upload helper
      async function uploadBatch(files: File[], base: string[]) {
        const out = [...base];
        for (let f of files) out.push(await uploadImage(f, 'vehicle-documents'));
        return out;
      }

      // 2) re-upload brand new docs
      const [nslUrls, motUrls, v5Urls, meterUrls, insUrls] =
        await Promise.all([
          uploadBatch(nsl.newFiles,    nsl.existingUrls),
          uploadBatch(mot.newFiles,    mot.existingUrls),
          uploadBatch(v5doc.newFiles,  v5doc.existingUrls),
          uploadBatch(meter.newFiles,  meter.existingUrls),
          uploadBatch(insure.newFiles, insure.existingUrls),
        ]);

      // 3) compute MOT expiry
      const motDate = formData.motTestDate
        ? new Date(formData.motTestDate)
        : vehicle.motTestDate!;
      const motExpiry = new Date(motDate);
      motExpiry.setMonth(motExpiry.getMonth() + 6);

      // 4) build update payload – *always* overwrite `documents`
      const updateData: Partial<Vehicle> = {
        vin: formData.vin,
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year, 10),
        registrationNumber: formData.registrationNumber,
        mileage: parseInt(formData.mileage, 10),
        motTestDate: motDate,
        motExpiry,
        nslExpiry: new Date(formData.nslExpiry),
        roadTaxExpiry: new Date(formData.roadTaxExpiry),
        insuranceExpiry: new Date(formData.insuranceExpiry),
        lastMaintenance: new Date(formData.lastMaintenance),
        nextMaintenance: new Date(formData.nextMaintenance),
        weeklyRentalPrice: Math.round(+formData.weeklyRentalPrice),
        dailyRentalPrice: Math.round(+formData.dailyRentalPrice),
        claimRentalPrice: Math.round(+formData.claimRentalPrice),
        owner: isCustomOwner ? owner : DEFAULT_OWNER,
        updatedAt: new Date(),
        documents: {
          nslImage: nslUrls,
          motImage: motUrls,
          v5Image: v5Urls,
          MeterCertificateImage: meterUrls,
          insuranceImage: insUrls,
        },
      };

      // 5) upload main image if provided
      if (newMainImage) {
        const url = await uploadImage(newMainImage, 'vehicle-main');
        ;(updateData as any).image = url;
      }

      // 6) write to Firestore
      await updateDoc(doc(db, 'vehicles', vehicle.id), updateData);

      toast.success('Vehicle updated successfully');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Edit Vehicle" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* — Basic Info — */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'VIN', name: 'vin' },
            { label: 'Reg Number', name: 'registrationNumber' },
            { label: 'Make', name: 'make' },
            { label: 'Model', name: 'model' },
            { label: 'Year', name: 'year', type: 'number' },
            { label: 'Mileage', name: 'mileage', type: 'number' },
          ].map((f) => (
            <FormField
              key={f.name}
              label={f.label}
              type={(f.type as any) || 'text'}
              value={(formData as any)[f.name]}
              onChange={(e) =>
                setFormData({ ...formData, [f.name]: e.target.value })
              }
              required
            />
          ))}
        </div>

        {/* — Dates — */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'MOT Test Date', name: 'motTestDate' },
            { label: 'NSL Expiry', name: 'nslExpiry' },
            { label: 'Road Tax Expiry', name: 'roadTaxExpiry' },
            { label: 'Insurance Expiry', name: 'insuranceExpiry' },
            { label: 'Last Maint', name: 'lastMaintenance' },
            { label: 'Next Maint', name: 'nextMaintenance' },
          ].map((f) => (
            <FormField
              key={f.name}
              label={f.label}
              type="date"
              value={(formData as any)[f.name]}
              onChange={(e) =>
                setFormData({ ...formData, [f.name]: e.target.value })
              }
              required
            />
          ))}
        </div>

        {/* — Rental Pricing — */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Rental Pricing</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Weekly (£)', name: 'weeklyRentalPrice' },
              { label: 'Daily (£)', name: 'dailyRentalPrice' },
              { label: 'Claim (£)', name: 'claimRentalPrice' },
            ].map((f) => (
              <FormField
                key={f.name}
                label={f.label}
                type="number"
                value={(formData as any)[f.name]}
                onChange={(e) =>
                  setFormData({ ...formData, [f.name]: e.target.value })
                }
                required
              />
            ))}
          </div>
        </div>

        {/* — Owner — */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Vehicle Owner</h3>
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isCustomOwner}
              onChange={(e) => {
                setIsCustomOwner(e.target.checked);
                if (!e.target.checked) setOwner(DEFAULT_OWNER);
              }}
              className="rounded border-gray-300"
            />
            <span>Custom Owner</span>
          </label>
          {isCustomOwner ? (
            <>
              <FormField
                label="Owner Name"
                value={owner.name}
                onChange={(e) =>
                  setOwner({ ...owner, name: e.target.value, isDefault: false })
                }
                required
              />
              <div>
                <label>Owner Address</label>
                <textarea
                  rows={3}
                  className="w-full rounded border-gray-300"
                  value={owner.address}
                  onChange={(e) =>
                    setOwner((o) => ({ ...o, address: e.target.value }))
                  }
                />
              </div>
            </>
          ) : (
            <p className="text-gray-500">
              Default: {DEFAULT_OWNER.name}, {DEFAULT_OWNER.address}
            </p>
          )}
        </div>

        {/* — Main Image — */}
        <div>
          <label>Vehicle Image</label>
          <div className="relative mt-1 flex justify-center p-6 border-2 border-gray-300 rounded">
            {imagePreview ? (
              <img src={imagePreview} className="h-32" />
            ) : (
              <Upload className="h-12 w-12 text-gray-400" />
            )}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleMainImageChange}
            />
          </div>
        </div>

        {/* — Documents — */}
        {[
          { title: 'NSL Images', dt: nsl },
          { title: 'MOT Images', dt: mot },
          { title: 'V5 Images', dt: v5doc },
          { title: 'Meter Certificate Images', dt: meter },
          { title: 'Insurance Images', dt: insure },
        ].map(({ title, dt }) => (
          <div key={title} className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">{title}</h3>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {dt.previews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} className="h-24 w-full rounded object-cover" />
                  <button
                    type="button"
                    onClick={() => dt.onRemove(i)}
                    className="absolute top-0 right-0 bg-white rounded-full p-1"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              ))}
            </div>
            <div className="relative flex justify-center p-6 border-2 border-gray-300 rounded">
              <Upload className="h-8 w-8 text-gray-400" />
              <input
                type="file"
                multiple
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => dt.onAdd(e.target.files!)}
              />
            </div>
          </div>
        ))}

        {/* — Actions — */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            {loading ? 'Updating…' : 'Update Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default VehicleEditModal;
