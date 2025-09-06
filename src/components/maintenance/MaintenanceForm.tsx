// src/components/maintenance/MaintenanceForm.tsx
import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, MaintenanceLog, Part } from '../../types';
import { addYears } from 'date-fns';
import { formatDateForInput } from '../../utils/dateHelpers';
import toast from 'react-hot-toast';
import FileUpload from '../ui/FileUpload';
import ServiceCenterDropdown from './ServiceCenterDropdown';
import FormField from '../ui/FormField';
import { createMaintenanceTransaction } from '../../utils/financeTransactions';
import { createMileageHistoryRecord } from '../../utils/mileageUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../ui/SearchableSelect';
import { useFormattedDisplay } from '../../hooks/useFormattedDisplay';
import { uploadMaintenanceAttachments } from '../../utils/maintenanceUpload';
import productService from '../../services/product.service';
import maintenanceCategoryService from '../../services/maintenanceCategory.service';

interface MaintenanceFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  editLog?: MaintenanceLog;
}

interface PartSuggestion {
  id: string;
  partNumber: string;
  name: string;
  lastCost: number; // comes from product.retailPrice (fallback to legacy price)
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ vehicles, onClose, editLog }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);

  // --- NEW: manual entry toggle & fields ---
  const [manualEntry, setManualEntry] = useState(false);
  const [manualMake, setManualMake] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [manualRegNumber, setManualRegNumber] = useState('');
  const [manualMileage, setManualMileage] = useState(0);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(editLog?.vehicleId || '');
  const [existingAttachments, setExistingAttachments] = useState<
  { name: string; url: string }[]
>(editLog?.attachments || []);

  const [newAttachments, setNewAttachments] = useState<File[]>([]);

  const [parts, setParts] = useState<Part[]>(
  editLog?.parts.map(p => ({
    ...p,
    includeVAT: editLog.vatDetails?.partsVAT.find(v => v.partName === p.name)
      ?.includeVAT ?? false,
    discount: p.discount ?? 0,
  })) || [{ name: '', quantity: 1, cost: 0, includeVAT: false, discount: 0 }]
);

  const [showPartSuggestions, setShowPartSuggestions] = useState<boolean[]>([]);
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(editLog?.vatDetails?.laborVAT || false);
  const [existingPaidAmount, setExistingPaidAmount] = useState(editLog?.paidAmount || 0);
  const [additionalPayment, setAdditionalPayment] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState(editLog?.paymentMethod || 'cash');
  const [paymentReference, setPaymentReference] = useState(editLog?.paymentReference || '');
  const { formatCurrency } = useFormattedDisplay();

  const [maintenanceTypes, setMaintenanceTypes] = useState<string[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  useEffect(() => {
    setLoadingTypes(true);
    maintenanceCategoryService.getAll()
      .then(docs => setMaintenanceTypes(docs.map(d => d.name)))
      .catch(err => {
        console.error('Failed to load maintenance categories:', err);
        toast.error('Could not load maintenance categories');
      })
      .finally(() => setLoadingTypes(false));
  }, []);

  const [formData, setFormData] = useState({
    type: editLog?.type || '',
    description: editLog?.description || '',
    serviceProvider: editLog?.serviceProvider || '',
    location: editLog?.location || '',
    date: formatDateForInput(editLog?.date) || new Date().toISOString().split('T')[0],
    currentMileage: editLog?.currentMileage || 0,
    laborHours: editLog?.laborHours || 0,
    laborRate: editLog?.laborRate || 75,
    nextServiceMileage: editLog?.nextServiceMileage || 0,
    nextServiceDate:
      formatDateForInput(editLog?.nextServiceDate) || addYears(new Date(), 1).toISOString().split('T')[0],
    notes: editLog?.notes || '',
    status: editLog?.status || 'scheduled',
  });

  const computeCosts = () => {
  const round = (n: number) => Math.round(n * 100) / 100;
  let totalDiscount = 0;

  // Sum up parts (with per-line discount & VAT)
  const partsTotal = round(
    parts.reduce((sum, p) => {
      // line gross = unit cost × qty
      const lineGross = round(p.cost * p.quantity);

      // discount amount on this line
      const discAmt = round((p.discount / 100) * lineGross);
      totalDiscount = round(totalDiscount + discAmt);

      // net after discount
      const net = round(lineGross - discAmt);

      // VAT on this line if applicable
      const vat = p.includeVAT ? round(net * 0.2) : 0;

      // accumulate
      return round(sum + net + vat);
    }, 0)
  );

  // Labor base cost
  const laborBase = round(formData.laborHours * formData.laborRate);

  // labor + VAT if toggled
  const laborTotal = includeVATOnLabor
    ? round(laborBase * 1.2)
    : laborBase;

  // subtotal before separating out VAT/net
  const subtotal = round(partsTotal + laborTotal);

  // compute total VAT separately for netAmount calculation
  const vatAmount = round(
    parts.reduce((acc, p) => {
      const lineGross = round(p.cost * p.quantity);
      const discAmt = round((p.discount / 100) * lineGross);
      const net = round(lineGross - discAmt);
      return acc + (p.includeVAT ? round(net * 0.2) : 0);
    }, 0)
    + (includeVATOnLabor ? round(laborBase * 0.2) : 0)
  );

  // net = subtotal minus all VAT
  const netAmount = round(subtotal - vatAmount);

  return {
    partsTotal,
    laborTotal,
    netAmount,
    vatAmount,
    totalAmount: subtotal,
    totalDiscount
  };
};
  const { partsTotal, laborTotal, netAmount, vatAmount, totalAmount, totalDiscount } = computeCosts();

  const maxAdditionalPayment = parseFloat((totalAmount - existingPaidAmount).toFixed(2));
  const totalPaidAmount = existingPaidAmount + additionalPayment;
  const remainingAmount = totalAmount - totalPaidAmount;
  const paymentStatus = totalPaidAmount >= totalAmount ? 'paid' : totalPaidAmount > 0 ? 'partially_paid' : 'unpaid';

  useEffect(() => { if (editLog) setExistingPaidAmount(editLog.paidAmount || 0); }, [editLog]);

  useEffect(() => {
    if (!manualEntry && selectedVehicleId) {
      const v = vehicles.find(v => v.id === selectedVehicleId);
      if (v) {
        setFormData(prev => ({
          ...prev,
          currentMileage: v.mileage,
          nextServiceMileage: v.mileage + 25000
        }));
      }
    }
  }, [manualEntry, selectedVehicleId, vehicles]);

  useEffect(() => {
    if (!editLog) {
      const d = new Date(formData.date);
      setFormData(prev => ({ ...prev, nextServiceDate: addYears(d, 1).toISOString().split('T')[0] }));
    }
  }, [formData.date, editLog]);

  const [partSuggestionsList, setPartSuggestionsList] = useState<PartSuggestion[]>([]);
  useEffect(() => {
  productService.getAll()
    .then(ps =>
      setPartSuggestionsList(
        ps.map(p => ({
          id: p.id,
          partNumber: p.partNumber ?? '',
          name: p.name ?? '',
          lastCost: Number(p.retailPrice ?? p.price ?? 0), // ← retailPrice first
        }))
      )
    )
    .catch(console.error);
}, []);
  useEffect(() => setShowPartSuggestions(new Array(parts.length).fill(false)), [parts.length]);

  const handleServiceCenterSelect = (c: any) => setFormData(prev => ({
    ...prev,
    serviceProvider: c.name,
    location: `${c.address}, ${c.postcode}`,
    laborRate: c.hourlyRate
  }));
  const handleAdditionalPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = parseFloat(e.target.value);
    if (!isNaN(v)) {
      v = Math.min(Math.max(0, v), maxAdditionalPayment);
      setAdditionalPayment(Math.round(v * 100) / 100);
    } else {
      setAdditionalPayment(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) {
    toast.error('Please log in');
    return;
  }
  if (!manualEntry && !selectedVehicleId) {
    toast.error('Please select a vehicle');
    return;
  }
  if (
    manualEntry &&
    (!manualMake.trim() || !manualModel.trim() || !manualRegNumber.trim())
  ) {
    toast.error('Please fill in all vehicle fields');
    return;
  }

  setLoading(true);
  try {
    // 1) Determine which vehicle to use
    let vehicleIdToUse: string;
    let vehicleToUse: Vehicle;
    if (manualEntry) {
      const vd = {
        make: manualMake.trim(),
        model: manualModel.trim(),
        registrationNumber: manualRegNumber.trim(),
        mileage: manualMileage,
      };
      const vr = await addDoc(collection(db, 'vehicles'), vd);
      vehicleIdToUse = vr.id;
      vehicleToUse = { id: vr.id, ...vd } as Vehicle;
    } else {
      const ev = vehicles.find(v => v.id === selectedVehicleId)!;
      vehicleIdToUse = ev.id;
      vehicleToUse = ev;
    }

    // 2) Build the maintenance object to write
    const maintenanceData = {
      vehicleId: vehicleIdToUse,
      type: formData.type,
      description: formData.description,
      serviceProvider: formData.serviceProvider,
      location: formData.location,
      date: new Date(formData.date),
      currentMileage: formData.currentMileage,
      nextServiceMileage: formData.nextServiceMileage,
      nextServiceDate: new Date(formData.nextServiceDate),
      parts: parts.map(p => ({
        name: p.name,
        quantity: p.quantity,
        cost: p.cost,
        discount: p.discount,
        includeVAT: p.includeVAT,
      })),
      laborHours: formData.laborHours,
      laborRate: formData.laborRate,
      laborCost: laborTotal,
      cost: totalAmount,
      netAmount,     // ← new
      vatAmount,     // ← new
      paidAmount: totalPaidAmount,
      remainingAmount,
      paymentStatus,
      paymentMethod,
      paymentReference,
      status: formData.status,
      notes: formData.notes,
      totalDiscount,
      vatDetails: {
        partsVAT: parts.map(p => ({ partName: p.name, includeVAT: p.includeVAT })),
        laborVAT: includeVATOnLabor,
      },
    };

    if (editLog) {
      // 3A) update existing record
      await updateDoc(doc(db, 'maintenanceLogs', editLog.id), {
        ...maintenanceData,
        updatedAt: new Date(),
        updatedBy: user.id,
      });

      // 3B) record additional payment if any
      if (additionalPayment > 0) {
        await createMaintenanceTransaction(
          { id: editLog.id, ...maintenanceData },
          vehicleToUse,
          additionalPayment,
          paymentMethod,
          paymentReference
        );
      }

      // 3C) upload & merge any new attachments
      if (newAttachments.length) {
        const uploaded = await uploadMaintenanceAttachments(editLog.id, newAttachments);
        const merged = [...existingAttachments, ...uploaded];
        await updateDoc(doc(db, 'maintenanceLogs', editLog.id), {
          attachments: merged,
        });
        setExistingAttachments(merged);
        setNewAttachments([]);
      }

      toast.success('Maintenance updated successfully');
    } else {
      // 4A) create a brand-new log
      const dr = await addDoc(collection(db, 'maintenanceLogs'), {
        ...maintenanceData,
        createdAt: new Date(),
        createdBy: user.id,
        updatedAt: new Date(),
      });

      // 4B) initial payment record
      if (totalPaidAmount > 0) {
        await createMaintenanceTransaction(
          { id: dr.id, ...maintenanceData },
          vehicleToUse,
          totalPaidAmount,
          paymentMethod,
          paymentReference
        );
      }

      // 4C) upload attachments & persist URLs
      if (newAttachments.length) {
        const uploaded = await uploadMaintenanceAttachments(dr.id, newAttachments);
        await updateDoc(doc(db, 'maintenanceLogs', dr.id), {
          attachments: uploaded,
        });
        setExistingAttachments(uploaded);
        setNewAttachments([]);
      }

      // 4D) record mileage history
      if (formData.currentMileage !== vehicleToUse.mileage) {
        await createMileageHistoryRecord(
          vehicleToUse,
          formData.currentMileage,
          user.name || 'System',
          'Updated during maintenance'
        );
      }

      toast.success('Maintenance scheduled successfully');
    }

    onClose();
  } catch (error) {
    console.error(error);
    toast.error(
      editLog ? 'Failed to update maintenance' : 'Failed to schedule maintenance'
    );
  } finally {
    setLoading(false);
  }
};




  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle selector / manual entry toggle */}
      <div className="flex items-center space-x-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={manualEntry}
            onChange={e => setManualEntry(e.target.checked)}
            disabled={!!editLog}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="ml-2 text-sm text-gray-600">Enter vehicle manually</span>
        </label>
      </div>
      {manualEntry && !editLog ? (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="text"
            label="Make"
            value={manualMake}
            onChange={e => setManualMake(e.target.value)}
            required
          />
          <FormField
            type="text"
            label="Model"
            value={manualModel}
            onChange={e => setManualModel(e.target.value)}
            required
          />
          <FormField
            type="text"
            label="Registration Number"
            value={manualRegNumber}
            onChange={e => setManualRegNumber(e.target.value)}
            required
          />
          <FormField
            type="number"
            label="Current Mileage"
            value={manualMileage}
            onChange={e => setManualMileage(parseInt(e.target.value) || 0)}
            required
            min={0}
          />
        </div>
      ) : (
        <SearchableSelect
          label="Vehicle"
          options={vehicles.map(v => ({
            id: v.id,
            label: `${v.make} ${v.model}`,
            subLabel: v.registrationNumber
          }))}
          value={selectedVehicleId}
          onChange={setSelectedVehicleId}
          placeholder="Search vehicles…"
          required
          disabled={!!editLog}
        />
      )}

      {/* Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        {loadingTypes ? (
          <div className="text-sm text-gray-500 mt-2">Loading types…</div>
        ) : (
          <select
            value={formData.type}
            onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="" disabled>-- Select Type --</option>
            {maintenanceTypes.map(t => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1).replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Date, Service Center, Mileage, Next Service, Status */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Date"
          value={formData.date}
          onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">Service Center</label>
          <ServiceCenterDropdown
            value={formData.serviceProvider}
            onChange={handleServiceCenterSelect}
            onInputChange={value => setFormData(prev => ({ ...prev, serviceProvider: value }))}
          />
        </div>
        <FormField
          type="number"
          label="Current Mileage"
          value={formData.currentMileage}
          onChange={e => setFormData(prev => ({ ...prev, currentMileage: parseInt(e.target.value) }))}
          required
          min={0}
        />
        <FormField
          type="number"
          label="Next Service Mileage"
          value={formData.nextServiceMileage}
          onChange={e => setFormData(prev => ({ ...prev, nextServiceMileage: parseInt(e.target.value) }))}
          required
          min={formData.currentMileage}
        />
        <FormField
          type="date"
          label="Next Service Date"
          value={formData.nextServiceDate}
          onChange={e => setFormData(prev => ({ ...prev, nextServiceDate: e.target.value }))}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={formData.status}
            onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
            className="mt-1 block w-full rounded-md border-gray-300 focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      {/* Parts Section with Discount + VAT */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-lg font-medium text-gray-900">Parts</label>
          <button
            type="button"
            onClick={() =>
              setParts([
                ...parts,
                { name: '', quantity: 1, cost: 0, includeVAT: false, discount: 0 }
              ])
            }
            className="text-sm text-primary hover:text-primary-600"
          >
            Add Part
          </button>
        </div>
        <div className="space-y-3">
          {parts.map((part, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end p-3 border border-gray-200 rounded-md bg-gray-50"
            >
              {/* Part Name + Suggestions */}
<div className="relative col-span-1 sm:col-span-2">
  <FormField
    label="Part Name"
    value={part.name}
    onChange={e => {
      const newParts = [...parts];
      newParts[index] = { ...newParts[index], name: e.target.value };
      setParts(newParts);
    }}
    onFocus={() => {
      const arr = [...showPartSuggestions]; arr[index] = true; setShowPartSuggestions(arr);
    }}
    onBlur={() => {
      setTimeout(() => {
        const arr = [...showPartSuggestions]; arr[index] = false; setShowPartSuggestions(arr);
      }, 100);
    }}
    placeholder="Type to search products (name or part number)…"
    inputClassName="w-full"
  />

  {showPartSuggestions[index] && part.name && (() => {
    const q = part.name.toLowerCase();
    const matches = partSuggestionsList.filter(s =>
      s.name.toLowerCase().includes(q) || s.partNumber.toLowerCase().includes(q)
    );
    return matches.length > 0 ? (
      <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
        {matches.map((s) => (
          <li
            key={s.id}
            className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
            onMouseDown={() => {
              const newParts = [...parts];
              newParts[index] = {
                ...newParts[index],
                name: s.name,
                cost: s.lastCost, // ← auto-fill Unit Price from retailPrice
              };
              setParts(newParts);
              const arr = [...showPartSuggestions]; arr[index] = false; setShowPartSuggestions(arr);
            }}
            title={`${s.name} (${s.partNumber})`}
          >
            <span className="truncate">
              {s.name}
              {s.partNumber ? <span className="text-gray-500"> — {s.partNumber}</span> : null}
            </span>
            <span className="text-gray-500 text-sm ml-3">
              {formatCurrency(s.lastCost)}
            </span>
          </li>
        ))}
      </ul>
    ) : null;
  })()}
</div>


              {/* Quantity */}
              <FormField
                type="number"
                label="Quantity"
                value={part.quantity}
                onChange={e => {
                  const newParts = [...parts];
                  newParts[index] = { ...newParts[index], quantity: parseInt(e.target.value) || 0 };
                  setParts(newParts);
                }}
                min={1}
                inputClassName="w-full"
              />

              {/* Unit Price */}
              <FormField
                type="number"
                label="Unit Price (£)"
                value={part.cost}
                onChange={e => {
                  const newParts = [...parts];
                  newParts[index] = { ...newParts[index], cost: parseFloat(e.target.value) || 0 };
                  setParts(newParts);
                }}
                min={0}
                step={0.01}
                inputClassName="w-full"
              />

              {/* Discount % */}
              <FormField
                type="number"
                label="Discount (%)"
                value={part.discount}
                onChange={e => {
                  const newParts = [...parts];
                  newParts[index] = { ...newParts[index], discount: parseFloat(e.target.value) || 0 };
                  setParts(newParts);
                }}
                min={0}
                max={100}
                step={0.1}
                inputClassName="w-full"
              />

              {/* VAT + Remove */}
              <div className="flex items-center space-x-4 col-span-1 sm:col-span-1">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={part.includeVAT}
                    onChange={e => {
                      const newParts = [...parts];
                      newParts[index] = { ...newParts[index], includeVAT: e.target.checked };
                      setParts(newParts);
                    }}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-600">+VAT</span>
                </label>
                <button
                  type="button"
                  onClick={() => setParts(parts.filter((_, i) => i !== index))}
                  className="text-red-600 hover:text-red-800"
                  title="Remove Part"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Labor Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Labor</label>
        <div className="flex items-center space-x-2 mt-1">
          <input
  type="number"
  value={formData.laborHours}
  onChange={e => setFormData(prev => ({ ...prev, laborHours: parseFloat(e.target.value) || 0 }))}
  placeholder="Hours"
  className="w-28 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
  min={0}
  step="any"              // ✅ allows 0.6, 0.75, etc.
  inputMode="decimal"
/>

          <span className="py-2">×</span>
          <input
            type="number"
            value={formData.laborRate}
            onChange={e => setFormData(prev => ({ ...prev, laborRate: parseFloat(e.target.value) || 0 }))}
            placeholder="Rate/hour"
            className="w-28 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min={0}
            step={0.01}
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeVATOnLabor}
              onChange={e => setIncludeVATOnLabor(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">+VAT</span>
          </label>
          <span className="py-2 font-medium text-gray-800">
            = {formatCurrency(includeVATOnLabor
              ? formData.laborHours * formData.laborRate * 1.2
              : formData.laborHours * formData.laborRate
            )}
          </span>
        </div>
      </div>
      
      
      <FileUpload
      label="Add Attachments"
      accept="image/*,.pdf,.doc,.docx"
      multiple
      value={newAttachments}
      onChange={setNewAttachments}
      showPreview
    />


      {existingAttachments.length > 0 && (
  <div className="mb-4">
    <h4 className="font-medium">Current Attachments</h4>
    <ul className="space-y-2">
      {existingAttachments.map((att, idx) => (
        <li key={idx} className="flex items-center space-x-2">
          <a
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {att.name}
          </a>
          <button
            type="button"
            onClick={() =>
              setExistingAttachments(existingAttachments.filter((_, i) => i !== idx))
            }
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  </div>
)}


      {/* Payment Section */}
      <div className="border-t pt-4 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
        {editLog && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between text-sm">
              <span>Previously Paid Amount:</span>
              <span className="font-medium text-green-600">{formatCurrency(existingPaidAmount)}</span>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="number"
            step={0.01}
            label={editLog ? "Additional Payment" : "Amount to Pay"}
            value={additionalPayment}
            onChange={handleAdditionalPaymentChange}
            min={0}
            max={maxAdditionalPayment}
            placeholder={`Up to ${formatCurrency(maxAdditionalPayment)}`}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div className="col-span-2">
            <FormField
              label="Payment Reference"
              value={paymentReference}
              onChange={e => setPaymentReference(e.target.value)}
              placeholder="Enter payment reference or transaction ID"
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
  <div className="flex justify-between text-sm font-medium">
    <span>NET:</span>
    <span>{formatCurrency(netAmount)}</span>
  </div>
  <div className="flex justify-between text-sm">
    <span>VAT:</span>
    <span>{formatCurrency(vatAmount)}</span>
  </div>
  {totalDiscount > 0 && (
    <div className="flex justify-between text-sm text-red-600">
      <span>Discount:</span>
      <span>–{formatCurrency(totalDiscount)}</span>
    </div>
  )}
  <div className="flex justify-between text-lg font-bold pt-2 border-t">
    <span>Total:</span>
    <span>{formatCurrency(totalAmount)}</span>
  </div>
  <div className="flex justify-between text-sm text-green-600">
    <span>Paid:</span>
    <span>{formatCurrency(totalPaidAmount)}</span>
  </div>
  <div className="flex justify-between text-sm text-amber-600">
    <span>Owing:</span>
    <span>{formatCurrency(remainingAmount)}</span>
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
          {loading ? 'Saving…' : editLog ? 'Update Maintenance' : 'Schedule Maintenance'}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceForm;
