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
import { Upload, X, Car, Wrench, FileCheck, Tag, User } from 'lucide-react';
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
  departments?: { id: string; name: string }[]; // ✅ Added departments prop
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

const VehicleForm: React.FC<VehicleFormProps> = ({ vehicle, departments = [], onClose, onSubmit }) => {
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

    // ✅ Group & Department Field
    assignedGroupId: vehicle?.assignedGroupId ?? '',
    assignedDepartmentId: vehicle?.assignedDepartmentId ?? '', // ✅ Added
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

      // ✅ Lookup selected group and department
      const selectedGroup = groups.find(g => g.id === formData.assignedGroupId);
      const selectedDepartment = departments.find(d => d.id === formData.assignedDepartmentId); // ✅ Added

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
        
        // ✅ Inject Group and Department IDs
        assignedGroupId: formData.assignedGroupId || null,
        assignedGroupName: selectedGroup ? selectedGroup.name : null,
        assignedDepartmentId: formData.assignedDepartmentId || null, // ✅ Added
        assignedDepartmentName: selectedDepartment ? selectedDepartment.name : null, // ✅ Added

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
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      {/* TABS NAVIGATION */}
      <div className="flex border-b border-[#E2E8F0] px-6 pt-2 shrink-0 bg-[#F8FAFC]">
        <button
          type="button"
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
            activeTab === 'vehicle'
              ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          onClick={() => setActiveTab('vehicle')}
        >
          <Car className="w-4 h-4 pointer-events-none" />
          <span>Vehicle Details</span>
        </button>
        <button
          type="button"
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
            activeTab === 'service'
              ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          onClick={() => setActiveTab('service')}
        >
          <Wrench className="w-4 h-4 pointer-events-none" />
          <span>Service Details</span>
        </button>
        <button
          type="button"
          className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-medium text-sm transition-all cursor-pointer ${
            activeTab === 'license'
              ? 'border-blue-600 text-blue-600 font-bold bg-white rounded-t-lg shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
          onClick={() => setActiveTab('license')}
        >
          <FileCheck className="w-4 h-4 pointer-events-none" />
          <span>License Details</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 no-scrollbar">
        
        {/* SECTION 1: VEHICLE DETAILS */}
        {activeTab === 'vehicle' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Core Specifications</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="VIN" value={formData.vin} onChange={e => setFormData({ ...formData, vin: e.target.value })} required disabled={isCompany} />
                <FormField label="Registration Number" value={formData.registrationNumber} onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })} required disabled={isCompany} />
                <FormField label="Make" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })} required disabled={isCompany} />
                <FormField label="Model" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} required disabled={isCompany} />
                <FormField type="number" label="Year" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} required disabled={isCompany} />
                
                {/* Group Assignment selector in Form */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Assign Finance Group</label>
                  <SearchableSelect
                    options={groups.map(g => ({ id: g.id, label: g.name }))}
                    value={formData.assignedGroupId}
                    onChange={(val) => setFormData({ ...formData, assignedGroupId: (val as string) || '' })}
                    placeholder="Select Group (Optional)"
                    isClearable
                    label=""
                  />
                </div>

                {/* Department Assignment selector in Form */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Assign Department</label>
                  <SearchableSelect
                    options={departments.map(d => ({ id: d.id, label: d.name }))}
                    value={formData.assignedDepartmentId}
                    onChange={(val) => setFormData({ ...formData, assignedDepartmentId: (val as string) || '' })}
                    placeholder="Select Department (Optional)"
                    isClearable
                    label=""
                  />
                </div>

                <FormField type="date" label="Purchased Date" value={formData.purchasedDate} onChange={e => setFormData({ ...formData, purchasedDate: e.target.value })} disabled={isCompany} />
                <FormField type="date" label="First Registration Date" value={formData.firstRegistrationDate} onChange={e => setFormData({ ...formData, firstRegistrationDate: e.target.value })} disabled={isCompany} />
                <FormField type="date" label="Warranty Start Date" value={formData.warrantyStartDate} onChange={e => setFormData({ ...formData, warrantyStartDate: e.target.value })} disabled={isCompany} />
                <FormField type="date" label="Warranty End Date" value={formData.warrantyEndDate} onChange={e => setFormData({ ...formData, warrantyEndDate: e.target.value })} disabled={isCompany} />
              </div>
            </div>

            {!isCompany && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Rental Pricing
                </h3>
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
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" /> Vehicle Owner
                </h3>
                <div className="space-y-4 max-w-lg">
                  <label className="flex items-center space-x-2 text-slate-800 font-medium cursor-pointer">
                    <input type="checkbox" checked={isCustomOwner} onChange={e => { setIsCustomOwner(e.target.checked); if (!e.target.checked) setOwner(DEFAULT_OWNER); }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 bg-white" />
                    <span>Custom Owner</span>
                  </label>
                  {isCustomOwner ? (
                    <div className="space-y-4">
                      <FormField label="Owner Name" value={owner?.name || ''} onChange={e => setOwner({ ...(owner || {}), name: e.target.value, isDefault: false })} required />
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Owner Address</label>
                        <textarea rows={3} value={owner?.address || ''} onChange={e => setOwner({ ...(owner || {}), address: e.target.value })} className="mt-1 block w-full rounded-xl border-[1.5px] border-[#CBD5E1] bg-white text-[#0F172A] p-3 shadow-xs focus:border-blue-500 focus:ring-blue-500 sm:text-sm" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Linked Finance Account</label>
                        <SearchableSelect
                          options={accounts.map(account => ({ id: account.id, label: account.name }))}
                          value={(owner as any)?.accountId || ''}
                          onChange={(selectedId) => {
                            const selectedAcc = accounts.find(a => a.id === selectedId);
                            setOwner({ ...(owner || {}), name: owner?.name || '', address: owner?.address || '', accountId: (selectedId as string) || null, accountName: selectedAcc?.name || null, isDefault: false } as any);
                          }}
                          placeholder="Select Linked Account (Optional)"
                          isClearable
                          label=""
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 bg-white p-3.5 rounded-xl border border-slate-200">
                      Default: <span className="font-semibold text-slate-900">{DEFAULT_OWNER.name}</span>, {DEFAULT_OWNER.address}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Vehicle Image</label>
              <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl bg-white hover:bg-slate-50 transition-colors">
                <div className="space-y-1 text-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Vehicle preview" className="mx-auto h-40 w-auto object-cover rounded-xl shadow-md border border-slate-200" />
                  ) : (
                    <Upload className="mx-auto h-12 w-12 text-slate-400" />
                  )}
                  <div className="flex text-sm text-slate-500 justify-center mt-2">
                    {isCompany ? (
                      <span className="text-slate-400 italic mt-2">Uploading image not permitted</span>
                    ) : (
                      <>
                        <label className="relative cursor-pointer rounded-lg font-semibold text-blue-600 hover:text-blue-500 focus-within:outline-none">
                          <span>Upload a photo</span>
                          <input type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </>
                    )}
                  </div>
                  {!isCompany && <p className="text-xs text-slate-400">PNG, JPG, WebP up to 100 MB</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: SERVICE DETAILS */}
        {activeTab === 'service' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
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
                    <div className="absolute right-3 top-9 text-xs text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">Auto-Calculated</div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 ml-1">
                    Calculated by adding the 'Service Mileage Required' to the 'Last Service Mileage Done'.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">Service Dates</h3>
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
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Compliance Dates</h4>
              <div className="grid grid-cols-2 gap-6">
                <FormField type="date" label="MOT Test Date" value={formData.motTestDate} onChange={e => setFormData({ ...formData, motTestDate: e.target.value })} required disabled={isCompany} />
                <FormField type="date" label="NSL Expiry" value={formData.nslExpiry} onChange={e => setFormData({ ...formData, nslExpiry: e.target.value })} required disabled={isCompany} />
                <FormField type="date" label="Road Tax Expiry" value={formData.roadTaxExpiry} onChange={e => setFormData({ ...formData, roadTaxExpiry: e.target.value })} required disabled={isCompany} />
                <FormField type="date" label="Insurance Expiry" value={formData.insuranceExpiry} onChange={e => setFormData({ ...formData, insuranceExpiry: e.target.value })} required disabled={isCompany} />
              </div>
            </div>

            {!isCompany && (
              <div className="space-y-6">
                {[
                  { title: 'NSL Images', dt: nsl },
                  { title: 'MOT Images', dt: mot },
                  { title: 'V5 Images', dt: v5doc },
                  { title: 'Meter Certificate Images', dt: meter },
                  { title: 'Insurance Images', dt: insure }
                ].map(({ title, dt }) => (
                  <div key={title} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 mb-4">{title}</h3>
                    {dt.previews.length > 0 && (
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        {dt.previews.map((src, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={src}
                              alt={`${title} ${i + 1}`}
                              className="h-32 w-full object-cover rounded-xl border border-slate-200 shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => dt.removeAt(i)}
                              className="absolute -top-2 -right-2 bg-rose-600 border border-rose-500 rounded-full p-1.5 hover:bg-rose-500 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-xs text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition-all">
                      <Upload className="w-4 h-4 mr-2 text-slate-500" />
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
      <div className="border-t border-[#E2E8F0] p-4 sm:p-5 bg-[#F8FAFC] flex justify-end space-x-3 shrink-0 rounded-b-2xl">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-xs transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={loading}
          className="px-5 py-2.5 border border-transparent rounded-xl shadow-md text-white bg-blue-600 hover:bg-blue-500 font-bold disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? 'Saving...' : vehicle ? 'Update Vehicle' : 'Add Vehicle'}
        </button>
      </div>
    </div>
  );
};

export default VehicleForm;