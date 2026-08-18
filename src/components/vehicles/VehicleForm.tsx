// src/components/vehicles/VehicleForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Vehicle,
  DEFAULT_RENTAL_PRICES,
  DEFAULT_INSURANCE_AMOUNTS,
  DEFAULT_OWNER,
  MileageUpdate,
  VehicleOwner
} from '../../types/vehicle';
import { Account } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Upload, X, Car, Wrench, FileCheck } from 'lucide-react';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import { addMonths, parseISO } from 'date-fns';
import { validateImage, uploadImage } from '../../utils/imageUpload';
import toast from 'react-hot-toast';
import { Timestamp, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// ✅ Bring in Group Service
import financeGroupService, { FinanceGroup } from '../../services/financeGroup.service';

interface VehicleFormProps {
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmit: (data: Partial<Vehicle>) => Promise<void>;
}

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
  const { can, isCompany } = usePermissions();
  const [loading, setLoading] = useState(false);

  // Layout Tab State
  const [activeTab, setActiveTab] = useState<'vehicle' | 'service' | 'license'>('vehicle');

  // Accounts & Groups State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<FinanceGroup[]>([]);

  const [imagePreview, setImagePreview] = useState<string | null>(vehicle?.image || null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  const [owner, setOwner] = useState<VehicleOwner>(vehicle?.owner || DEFAULT_OWNER);
  const [isCustomOwner, setIsCustomOwner] = useState(!vehicle?.owner?.isDefault);

  const nsl = useDocumentManager(vehicle?.documents?.nslImage || []);
  const mot = useDocumentManager(vehicle?.documents?.motImage || []);
  const v5doc = useDocumentManager(vehicle?.documents?.v5Image || []);
  const meter = useDocumentManager(vehicle?.documents?.MeterCertificateImage || []);
  const insure = useDocumentManager(vehicle?.documents?.insuranceImage || []);

  // Fetch Accounts
  useEffect(() => {
    const q = query(collection(db, 'accounts'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accountData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Account[];
      setAccounts(accountData);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Fetch Finance Groups
  useEffect(() => {
    financeGroupService.getAll()
      .then(g => setGroups(g.sort((a,b)=> a.name.localeCompare(b.name))))
      .catch(console.error);
  }, []);

  const formatDateForInput = (t?: Timestamp | string | Date | null) => {
    if (!t) return '';
    const d = t instanceof Timestamp ? t.toDate() : typeof t === 'string' ? new Date(t) : t;
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 10);
  };

  // Prevent NaN if user clears input
  const toNumber = (value: string) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };

  const [formData, setFormData] = useState({
    vin: vehicle?.vin ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    year: vehicle?.year?.toString() ?? new Date().getFullYear().toString(),
    registrationNumber: vehicle?.registrationNumber ?? '',
    purchasedDate: formatDateForInput(vehicle?.purchasedDate ?? null),
    firstRegistrationDate: formatDateForInput(vehicle?.firstRegistrationDate ?? null),
    warrantyStartDate: formatDateForInput(vehicle?.warrantyStartDate ?? null),
    warrantyEndDate: formatDateForInput(vehicle?.warrantyEndDate ?? null),
    
    // Service Fields
    serviceInterval: (vehicle as any)?.serviceInterval?.toString() ?? '25000',
    mileage: vehicle?.mileage?.toString() ?? '0',
    nextServiceMileage: vehicle?.nextServiceMileage?.toString() ?? ((vehicle?.mileage ?? 0) + 25000).toString(),
    lastMaintenance: formatDateForInput(vehicle?.lastMaintenance ?? null),
    nextMaintenance: formatDateForInput(vehicle?.nextMaintenance ?? null),

    // Pricing
    weeklyRentalPrice: vehicle?.weeklyRentalPrice?.toString() ?? DEFAULT_RENTAL_PRICES.weekly.toString(),
    dailyRentalPrice: vehicle?.dailyRentalPrice?.toString() ?? DEFAULT_RENTAL_PRICES.daily.toString(),
    claimRentalPrice: vehicle?.claimRentalPrice?.toString() ?? DEFAULT_RENTAL_PRICES.claim.toString(),

    // Insurance amounts
    weeklyInsuranceAmount: (vehicle as any)?.weeklyInsuranceAmount?.toString() ?? DEFAULT_INSURANCE_AMOUNTS.weekly.toString(),
    dailyInsuranceAmount: (vehicle as any)?.dailyInsuranceAmount?.toString() ?? DEFAULT_INSURANCE_AMOUNTS.daily.toString(),
    claimInsuranceAmount: (vehicle as any)?.claimInsuranceAmount?.toString() ?? DEFAULT_INSURANCE_AMOUNTS.claim.toString(),

    // Dates (License/Compliance)
    insuranceExpiry: formatDateForInput(vehicle?.insuranceExpiry ?? null),
    motTestDate: formatDateForInput(vehicle?.motTestDate ?? null),
    nslExpiry: formatDateForInput(vehicle?.nslExpiry ?? null),
    roadTaxExpiry: formatDateForInput(vehicle?.roadTaxExpiry ?? null),

    // ✅ Group Field
    assignedGroupId: vehicle?.assignedGroupId ?? '',
  });

  const handleServiceMileageChange = (field: 'mileage' | 'serviceInterval', value: string) => {
    const newFormData = { ...formData, [field]: value };
    const currentMileage = parseInt(newFormData.mileage, 10) || 0;
    const interval = parseInt(newFormData.serviceInterval, 10) || 25000;
    
    newFormData.nextServiceMileage = (currentMileage + interval).toString();
    setFormData(newFormData);
  };

  const handleLastMaintenanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    let nextDateStr = formData.nextMaintenance;
    
    if (val) {
      const d = new Date(val);
      d.setFullYear(d.getFullYear() + 1);
      nextDateStr = d.toISOString().slice(0, 10);
    }
    
    setFormData({ ...formData, lastMaintenance: val, nextMaintenance: nextDateStr });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !validateImage(f)) return;
    setNewImageFile(f);
    const r = new FileReader();
    r.onloadend = () => setImagePreview(r.result as string);
    r.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const uploadBatch = async (files: File[], base: string[]) => {
        const out = [...base];
        for (let f of files) out.push(await uploadImage(f, 'vehicle-documents'));
        return out;
      };

      const [nslUrls, motUrls, v5Urls, meterUrls, insUrls] = await Promise.all([
        uploadBatch(nsl.newFiles, nsl.existingUrls),
        uploadBatch(mot.newFiles, mot.existingUrls),
        uploadBatch(v5doc.newFiles, v5doc.existingUrls),
        uploadBatch(meter.newFiles, meter.existingUrls),
        uploadBatch(insure.newFiles, insure.existingUrls)
      ]);

      const motDate = formData.motTestDate ? parseISO(formData.motTestDate) : undefined;
      const motExpiry = motDate ? addMonths(motDate, 6) : undefined;

      const newMileage = parseInt(formData.mileage, 10);
      const newServiceInterval = parseInt(formData.serviceInterval, 10);
      const nextServiceMileage = parseInt(formData.nextServiceMileage, 10);

      const finalOwner: any = isCustomOwner ? { ...owner } : { ...DEFAULT_OWNER };

      if (isCustomOwner) {
        if (!finalOwner.accountId) {
          finalOwner.accountId = null;
          finalOwner.accountName = null;
        } else {
          const selectedAcc = accounts.find(a => a.id === finalOwner.accountId);
          finalOwner.accountName = selectedAcc ? selectedAcc.name : null;
        }
      } else {
        finalOwner.accountId = null;
        finalOwner.accountName = null;
      }

      // ✅ Lookup selected group
      const selectedGroup = groups.find(g => g.id === formData.assignedGroupId);

      const payload: Partial<Vehicle> & { serviceInterval?: number } = {
        vin: formData.vin,
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year, 10),
        registrationNumber: formData.registrationNumber,
        
        mileage: newMileage,
        serviceInterval: newServiceInterval,
        nextServiceMileage: nextServiceMileage,
        
        insuranceExpiry: formData.insuranceExpiry ? parseISO(formData.insuranceExpiry) : undefined,
        motTestDate: motDate,
        motExpiry,
        nslExpiry: formData.nslExpiry ? parseISO(formData.nslExpiry) : undefined,
        roadTaxExpiry: formData.roadTaxExpiry ? parseISO(formData.roadTaxExpiry) : undefined,
        lastMaintenance: formData.lastMaintenance ? parseISO(formData.lastMaintenance) : undefined,
        nextMaintenance: formData.nextMaintenance ? parseISO(formData.nextMaintenance) : undefined,

        weeklyRentalPrice: toNumber(formData.weeklyRentalPrice),
        dailyRentalPrice: toNumber(formData.dailyRentalPrice),
        claimRentalPrice: toNumber(formData.claimRentalPrice),

        weeklyInsuranceAmount: toNumber(formData.weeklyInsuranceAmount),
        dailyInsuranceAmount: toNumber(formData.dailyInsuranceAmount),
        claimInsuranceAmount: toNumber(formData.claimInsuranceAmount),

        owner: finalOwner,

        purchasedDate: formData.purchasedDate ? parseISO(formData.purchasedDate) : undefined,
        firstRegistrationDate: formData.firstRegistrationDate ? parseISO(formData.firstRegistrationDate) : undefined,
        warrantyStartDate: formData.warrantyStartDate ? parseISO(formData.warrantyStartDate) : undefined,
        warrantyEndDate: formData.warrantyEndDate ? parseISO(formData.warrantyEndDate) : undefined,
        updatedAt: new Date(),
        
        // ✅ Inject Group IDs
        assignedGroupId: formData.assignedGroupId || null,
        assignedGroupName: selectedGroup ? selectedGroup.name : null,

        documents: {
          nslImage: nslUrls,
          motImage: motUrls,
          v5Image: v5Urls,
          MeterCertificateImage: meterUrls,
          insuranceImage: insUrls
        }
      };

      if (vehicle && typeof vehicle.mileage === 'number' && vehicle.mileage !== newMileage) {
        const history: MileageUpdate[] = Array.isArray(vehicle.mileageUpdates)
          ? [...vehicle.mileageUpdates]
          : [];
        history.push({
          date: new Date(),
          mileage: newMileage,
          updatedBy: user.uid || user.email || 'unknown',
          source: 'form'
        });
        payload.mileageUpdates = history;
      }

      if (newImageFile) {
        payload.image = await uploadImage(newImageFile, 'vehicle-main');
      }

      await onSubmit(payload);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save vehicle');
    } finally {
      setLoading(false);
    }
  };

  if (!can('vehicles', vehicle ? 'update' : 'create')) {
    return <div>You don’t have permission to {vehicle ? 'edit' : 'add'} vehicles.</div>;
  }

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* TABS NAVIGATION */}
      <div className="flex border-b border-gray-200 px-6 pt-2 shrink-0">
        <button
          type="button"
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'vehicle' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('vehicle')}
        >
          <Car className="w-4 h-4" />
          <span>Vehicle Details</span>
        </button>
        <button
          type="button"
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'service' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('service')}
        >
          <Wrench className="w-4 h-4" />
          <span>Service Details</span>
        </button>
        <button
          type="button"
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'license' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('license')}
        >
          <FileCheck className="w-4 h-4" />
          <span>License Details</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* SECTION 1: VEHICLE DETAILS */}
        {activeTab === 'vehicle' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="VIN" value={formData.vin} onChange={e => setFormData({ ...formData, vin: e.target.value })} required disabled={isCompany} />
              <FormField label="Registration Number" value={formData.registrationNumber} onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })} required disabled={isCompany} />
              <FormField label="Make" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} required disabled={isCompany} />
              <FormField label="Model" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} required disabled={isCompany} />
              <FormField type="number" label="Year" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} required disabled={isCompany} />
              
              {/* ✅ Added Group Assignment selector in Form */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Finance Group</label>
                <SearchableSelect
                  options={groups.map(g => ({ id: g.id, label: g.name }))}
                  value={formData.assignedGroupId}
                  onChange={(val) => setFormData({ ...formData, assignedGroupId: val || '' })}
                  placeholder="Select Group (Optional)"
                  isClearable
                />
              </div>

              <FormField type="date" label="Purchased Date" value={formData.purchasedDate} onChange={e => setFormData({ ...formData, purchasedDate: e.target.value })} disabled={isCompany} />
              <FormField type="date" label="First Registration Date" value={formData.firstRegistrationDate} onChange={e => setFormData({ ...formData, firstRegistrationDate: e.target.value })} disabled={isCompany} />
              <FormField type="date" label="Warranty Start Date" value={formData.warrantyStartDate} onChange={e => setFormData({ ...formData, warrantyStartDate: e.target.value })} disabled={isCompany} />
              <FormField type="date" label="Warranty End Date" value={formData.warrantyEndDate} onChange={e => setFormData({ ...formData, warrantyEndDate: e.target.value })} disabled={isCompany} />
            </div>

            {!isCompany && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Rental Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <FormField type="number" label="Weekly (£)" value={formData.weeklyRentalPrice} onChange={e => setFormData({ ...formData, weeklyRentalPrice: e.target.value })} min="0" step="0.0001" required />
                  <FormField type="number" label="Daily (£)" value={formData.dailyRentalPrice} onChange={e => setFormData({ ...formData, dailyRentalPrice: e.target.value })} min="0" step="0.0001" required />
                  <FormField type="number" label="Claim (£)" value={formData.claimRentalPrice} onChange={e => setFormData({ ...formData, claimRentalPrice: e.target.value })} min="0" step="0.0001" required />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <FormField type="number" label="Weekly Insurance (£)" value={formData.weeklyInsuranceAmount} onChange={e => setFormData({ ...formData, weeklyInsuranceAmount: e.target.value })} min="0" step="0.0001" required />
                  <FormField type="number" label="Daily Insurance (£)" value={formData.dailyInsuranceAmount} onChange={e => setFormData({ ...formData, dailyInsuranceAmount: e.target.value })} min="0" step="0.0001" required />
                  <FormField type="number" label="Claim Insurance (£)" value={formData.claimInsuranceAmount} onChange={e => setFormData({ ...formData, claimInsuranceAmount: e.target.value })} min="0" step="0.0001" required />
                </div>
              </div>
            )}

            {!isCompany && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Owner</h3>
                <div className="space-y-4 max-w-lg">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={isCustomOwner} onChange={e => { setIsCustomOwner(e.target.checked); if (!e.target.checked) setOwner(DEFAULT_OWNER); }} className="rounded border-gray-300 text-primary focus:ring-primary" />
                    <span>Custom Owner</span>
                  </label>
                  {isCustomOwner ? (
                    <div className="space-y-4">
                      <FormField label="Owner Name" value={owner?.name || ''} onChange={e => setOwner({ ...(owner || {}), name: e.target.value, isDefault: false })} required />
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Owner Address</label>
                        <textarea rows={3} value={owner?.address || ''} onChange={e => setOwner({ ...(owner || {}), address: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Linked Finance Account</label>
                        <SearchableSelect
                          options={accounts.map(account => ({ id: account.id, label: account.name }))}
                          value={(owner as any)?.accountId || ''}
                          onChange={(selectedId) => {
                            const selectedAcc = accounts.find(a => a.id === selectedId);
                            setOwner({ ...(owner || {}), name: owner?.name || '', address: owner?.address || '', accountId: selectedId || null, accountName: selectedAcc?.name || null, isDefault: false } as any);
                          }}
                          placeholder="Select Linked Account (Optional)"
                          isClearable
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md border border-gray-100">
                      Default: <span className="font-medium text-gray-700">{DEFAULT_OWNER.name}</span>, {DEFAULT_OWNER.address}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700">Vehicle Image</label>
              <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Vehicle preview" className="mx-auto h-40 w-auto object-cover rounded-md shadow-sm" />
                  ) : (
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  )}
                  <div className="flex text-sm text-gray-600 justify-center mt-2">
                    {isCompany ? (
                      <span className="text-gray-500 italic mt-2">Uploading image not permitted</span>
                    ) : (
                      <>
                        <label className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none">
                          <span>Upload a photo</span>
                          <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </>
                    )}
                  </div>
                  {!isCompany && <p className="text-xs text-gray-500">PNG, JPG, WebP up to 100 MB</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: SERVICE DETAILS */}
        {activeTab === 'service' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100/50">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <Wrench className="w-5 h-5 text-blue-600 mr-2" />
                Service Tracking Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <FormField
                  type="number"
                  label="Service Mileage Required"
                  value={formData.serviceInterval}
                  onChange={e => handleServiceMileageChange('serviceInterval', e.target.value)}
                  min="0"
                  required
                />
                
                <FormField
                  type="number"
                  label="Last Service Mileage Done"
                  value={formData.mileage}
                  onChange={e => handleServiceMileageChange('mileage', e.target.value)}
                  required
                />

                <div className="md:col-span-2">
                  <div className="relative">
                    <FormField
                      type="number"
                      label="Next Service Mileage"
                      value={formData.nextServiceMileage}
                      onChange={() => {}}
                      min={formData.mileage}
                      required
                      disabled={true}
                    />
                    <div className="absolute right-3 top-9 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">Auto-Calculated</div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 ml-1">
                    Calculated by adding the 'Service Mileage Required' to the 'Last Service Mileage Done'.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Service Dates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <FormField
                  type="date"
                  label="Last Service Date"
                  value={formData.lastMaintenance}
                  onChange={handleLastMaintenanceChange}
                  required
                />
                <FormField
                  type="date"
                  label="Next Service Date"
                  value={formData.nextMaintenance}
                  onChange={e => setFormData({ ...formData, nextMaintenance: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: LICENSE DETAILS */}
        {activeTab === 'license' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 gap-6">
              <FormField type="date" label="MOT Test Date" value={formData.motTestDate} onChange={e => setFormData({ ...formData, motTestDate: e.target.value })} required disabled={isCompany} />
              <FormField type="date" label="NSL Expiry" value={formData.nslExpiry} onChange={e => setFormData({ ...formData, nslExpiry: e.target.value })} required disabled={isCompany} />
              <FormField type="date" label="Road Tax Expiry" value={formData.roadTaxExpiry} onChange={e => setFormData({ ...formData, roadTaxExpiry: e.target.value })} required disabled={isCompany} />
              <FormField type="date" label="Insurance Expiry" value={formData.insuranceExpiry} onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })} required disabled={isCompany} />
            </div>

            {!isCompany && (
              <div className="space-y-8">
                {[
                  { title: 'NSL Images', dt: nsl },
                  { title: 'MOT Images', dt: mot },
                  { title: 'V5 Images', dt: v5doc },
                  { title: 'Meter Certificate Images', dt: meter },
                  { title: 'Insurance Images', dt: insure }
                ].map(({ title, dt }) => (
                  <div key={title} className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
                    {dt.previews.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {dt.previews.map((src, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={src}
                              alt={`${title} ${i + 1}`}
                              className="h-32 w-full object-cover rounded-lg border border-gray-200 shadow-sm"
                            />
                            <button
                              type="button"
                              onClick={() => dt.removeAt(i)}
                              className="absolute -top-2 -right-2 bg-white border border-red-200 rounded-full p-1.5 hover:bg-red-50 text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                      <Upload className="w-4 h-4 mr-2 text-gray-400" />
                      <span>Upload {title}</span>
                      <input
                        type="file"
                        className="sr-only"
                        multiple
                        accept="image/*"
                        onChange={e => e.target.files && dt.add(e.target.files)}
                      />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      {/* FIXED FOOTER ACTIONS */}
      <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-end space-x-3 shrink-0 rounded-b-lg">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-100 font-medium shadow-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading}
          className="px-5 py-2.5 border border-transparent rounded-md shadow-sm text-white bg-primary hover:bg-primary-600 font-medium disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
        </button>
      </div>
    </div>
  );
};

export default VehicleForm;