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
  name: string;
  lastCost: number;
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
  const [attachments, setAttachments] = useState<File[] | null>(null);

  const [parts, setParts] = useState<(Part & { includeVAT: boolean; discount: number })[]>(
    editLog?.parts.map(part => ({
      ...part,
      includeVAT: editLog.vatDetails?.partsVAT.find(v => v.partName === part.name)?.includeVAT || false,
      discount: 0,
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
    const partsTotal = round(
      parts.reduce((sum, p) => {
        const line = round(p.cost * p.quantity);
        const disc = round((p.discount / 100) * line);
        totalDiscount = round(totalDiscount + disc);
        const sub = round(line - disc);
        const vat = p.includeVAT ? round(sub * 0.2) : 0;
        return round(sum + sub + vat);
      }, 0)
    );
    const laborBase = round(formData.laborHours * formData.laborRate);
    const laborCost = includeVATOnLabor ? round(laborBase * 1.2) : laborBase;
    const subtotal = round(partsTotal + laborCost);
    const vatAmount = round(
      parts.reduce((a, p) => {
        const line = round(p.cost * p.quantity);
        const disc = round((p.discount / 100) * line);
        const sub = round(line - disc);
        return p.includeVAT ? round(a + sub * 0.2) : a;
      }, 0) + (includeVATOnLabor ? round(laborBase * 0.2) : 0)
    );
    return {
      partsTotal,
      laborTotal: laborCost,
      netAmount: round(subtotal - vatAmount),
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
      .then(ps => setPartSuggestionsList(ps.map(p => ({ name: p.name, lastCost: p.price }))))
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
  e.preventDefault()
  if (!user) {
    toast.error('Please log in')
    return
  }
  if (!manualEntry && !selectedVehicleId) {
    toast.error('Please select a vehicle')
    return
  }
  if (
    manualEntry &&
    (!manualMake.trim() || !manualModel.trim() || !manualRegNumber.trim())
  ) {
    toast.error('Please fill in all vehicle fields')
    return
  }

  setLoading(true)
  try {
    let vehicleIdToUse: string
    let vehicleToUse: Vehicle

    if (manualEntry) {
      const vd = {
        make: manualMake.trim(),
        model: manualModel.trim(),
        registrationNumber: manualRegNumber.trim(),
        mileage: manualMileage,
      }
      const vr = await addDoc(collection(db, 'vehicles'), vd)
      vehicleIdToUse = vr.id
      vehicleToUse = { id: vr.id, ...vd } as Vehicle
    } else {
      const ev = vehicles.find(v => v.id === selectedVehicleId)!
      vehicleIdToUse = ev.id
      vehicleToUse = ev
    }

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
      paidAmount: totalPaidAmount,
      remainingAmount,
      paymentStatus,
      paymentMethod,
      paymentReference,
      status: formData.status,
      notes: formData.notes,
      vatDetails: {
        partsVAT: parts.map(p => ({ partName: p.name, includeVAT: p.includeVAT })),
        laborVAT: includeVATOnLabor,
      },
    }

    if (editLog) {
      await updateDoc(doc(db, 'maintenanceLogs', editLog.id), {
        ...maintenanceData,
        updatedAt: new Date(),
        updatedBy: user.id,
      })

      if (additionalPayment > 0) {
        await createMaintenanceTransaction(
          { id: editLog.id, ...maintenanceData },
          vehicleToUse,
          additionalPayment,
          paymentMethod,
          paymentReference
        )
      }

      toast.success('Maintenance updated successfully')
    } else {
      const dr = await addDoc(collection(db, 'maintenanceLogs'), {
        ...maintenanceData,
        createdAt: new Date(),
        createdBy: user.id,
        updatedAt: new Date(),
      })

      if (totalPaidAmount > 0) {
        await createMaintenanceTransaction(
          { id: dr.id, ...maintenanceData },
          vehicleToUse,
          totalPaidAmount,
          paymentMethod,
          paymentReference
        )
      }

      if (attachments?.length) {
        await uploadMaintenanceAttachments(dr.id, attachments)
      }
      if (formData.currentMileage !== vehicleToUse.mileage) {
        await createMileageHistoryRecord(
          vehicleToUse,
          formData.currentMileage,
          user.name || 'System',
          'Updated during maintenance'
        )
      }

      toast.success('Maintenance scheduled successfully')
    }

    onClose()
  } catch (error) {
    console.error(error)
    toast.error(
      editLog
        ? 'Failed to update maintenance'
        : 'Failed to schedule maintenance'
    )
  } finally {
    setLoading(false)
  }
}


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
                    newParts[index] = { ...newParts[index], name: e.target.value }; setParts(newParts);
                  }}
                  onFocus={() => {
                    const arr = [...showPartSuggestions]; arr[index] = true; setShowPartSuggestions(arr);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      const arr = [...showPartSuggestions]; arr[index] = false; setShowPartSuggestions(arr);
                    }, 100);
                  }}
                  placeholder="Type to search products"
                  inputClassName="w-full"
                />
                {showPartSuggestions[index] && part.name && partSuggestionsList.filter(s =>
                  s.name.toLowerCase().includes(part.name.toLowerCase())
                ).length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {partSuggestionsList
                      .filter(s => s.name.toLowerCase().includes(part.name.toLowerCase()))
                      .map((s, i) => (
                        <li
                          key={i}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onMouseDown={() => {
                            const newParts = [...parts];
                            newParts[index] = { ...newParts[index], name: s.name, cost: s.lastCost };
                            setParts(newParts);
                            const arr = [...showPartSuggestions]; arr[index] = false; setShowPartSuggestions(arr);
                          }}
                        >
                          {s.name} <span className="text-gray-500 text-sm">(Last cost: {formatCurrency(s.lastCost)})</span>
                        </li>
                      ))}
                  </ul>
                )}
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
            step={0.5}
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
        label="Attachments"
        accept="image/*,.pdf,.doc,.docx"
        multiple
        value={attachments}
        onChange={setAttachments}
        showPreview
      />

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
            <span>NET Amount:</span>
            <span>{formatCurrency(netAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT Amount:</span>
            <span>{formatCurrency(vatAmount)}</span>
          </div>
          <div className="flex justify-between text-sm text-red-600">
            <span>Total Discount:</span>
            <span>- {formatCurrency(totalDiscount)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total Amount:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Paid Amount:</span>
              <span className="text-green-600">{formatCurrency(totalPaidAmount)}</span>
            </div>
            {remainingAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Remaining Amount:</span>
                <span className="text-amber-600">{formatCurrency(remainingAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span>Payment Status:</span>
              <span className="font-medium capitalize">{paymentStatus.replace('_',' ')}</span>
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
          {loading ? 'Saving…' : editLog ? 'Update Maintenance' : 'Schedule Maintenance'}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceForm;
