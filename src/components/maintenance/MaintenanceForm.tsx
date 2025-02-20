import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, MaintenanceLog, Part } from '../../types';
import { addYears } from 'date-fns';
import { formatDateForInput } from '../../utils/dateHelpers';
import toast from 'react-hot-toast';
import VehicleSelect from '../VehicleSelect';
import ServiceCenterDropdown from './ServiceCenterDropdown';
import FormField from '../ui/FormField';
import { createMaintenanceTransaction } from '../../utils/financeTransactions';
import { createFinanceTransaction } from '../../utils/financeTransactions';

import { createMileageHistoryRecord } from '../../utils/mileageUtils';
import { usePermissions } from '../../hooks/usePermissions';
import { calculateCosts } from '../../utils/maintenanceCostUtils';
import { useAuth } from '../../context/AuthContext';
import SearchableSelect from '../ui/SearchableSelect';

interface MaintenanceFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  editLog?: MaintenanceLog;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ vehicles, onClose, editLog }) => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(editLog?.vehicleId || '');
  const [parts, setParts] = useState<(Part & { includeVAT: boolean })[]>(
    editLog?.parts.map(part => ({
      ...part,
      includeVAT: editLog.vatDetails?.partsVAT.find(v => v.partName === part.name)?.includeVAT || false
    })) || []
  );
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(editLog?.vatDetails?.laborVAT || false);
  const [paidAmount, setPaidAmount] = useState(editLog?.paidAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState(editLog?.paymentMethod || 'cash');
  const [paymentReference, setPaymentReference] = useState(editLog?.paymentReference || '');

  const [formData, setFormData] = useState({
    type: editLog?.type || 'yearly-service',
    description: editLog?.description || '',
    serviceProvider: editLog?.serviceProvider || '',
    location: editLog?.location || '',
    date: formatDateForInput(editLog?.date) || new Date().toISOString().split('T')[0],
    currentMileage: editLog?.currentMileage || 0,
    laborHours: editLog?.laborHours || 0,
    laborRate: editLog?.laborRate || 75,
    nextServiceMileage: editLog?.nextServiceMileage || 0,
    nextServiceDate: formatDateForInput(editLog?.nextServiceDate) || addYears(new Date(), 1).toISOString().split('T')[0],
    notes: editLog?.notes || '',
    status: editLog?.status || 'scheduled',
  });

  const costs = calculateCosts(parts, formData.laborHours, formData.laborRate, includeVATOnLabor);

  const handlePaidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      value = Math.round(value * 100) / 100; // Ensures only two decimal places
      setPaidAmount(value);
    } else {
      setPaidAmount(0);
    }
  };
  
  const remainingAmount = costs.totalAmount - paidAmount;
  const paymentStatus = paidAmount >= costs.totalAmount ? 'paid' : 
                       paidAmount > 0 ? 'partially_paid' : 'unpaid';

                        

  useEffect(() => {
    if (selectedVehicleId) {
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (selectedVehicle) {
        setFormData(prev => ({
          ...prev,
          currentMileage: selectedVehicle.mileage,
          nextServiceMileage: selectedVehicle.mileage + 25000
        }));
      }
    }
  }, [selectedVehicleId, vehicles]);
  useEffect(() => {
    if (!editLog) {
      const serviceDate = new Date(formData.date);
      const nextServiceDate = addYears(serviceDate, 1);
      setFormData(prev => ({
        ...prev,
        nextServiceDate: nextServiceDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.date, editLog]);

  const handleServiceCenterSelect = (center: {
    name: string;
    address: string;
    postcode: string;
    hourlyRate: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      serviceProvider: center.name,
      location: `${center.address}, ${center.postcode}`,
      laborRate: center.hourlyRate,
    }));
  };

  // Update the handleSubmit function in MaintenanceForm.tsx

// src/components/maintenance/MaintenanceForm.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user || !selectedVehicleId) {
    toast.error('Please select a vehicle');
    return;
  }

  setLoading(true);

  try {
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    if (!selectedVehicle) {
      throw new Error('Vehicle not found');
    }

    const maintenanceData = {
      vehicleId: selectedVehicleId,
      type: formData.type,
      description: formData.description,
      serviceProvider: formData.serviceProvider,
      location: formData.location,
      date: new Date(formData.date),
      currentMileage: formData.currentMileage,
      nextServiceMileage: formData.nextServiceMileage,
      nextServiceDate: new Date(formData.nextServiceDate || addYears(new Date(formData.date), 1)),
      parts: parts.map(({ includeVAT, ...part }) => part),
      laborHours: formData.laborHours,
      laborRate: formData.laborRate,
      laborCost: costs.laborTotal,
      cost: costs.totalAmount,
      paidAmount: paidAmount,
      remainingAmount: costs.totalAmount - paidAmount,
      paymentStatus: paidAmount >= costs.totalAmount ? 'paid' : 
                    paidAmount > 0 ? 'partially_paid' : 'unpaid',
      paymentMethod,
      paymentReference,
      status: formData.status,
      notes: formData.notes,
      vatDetails: {
        partsVAT: parts.map(part => ({
          partName: part.name,
          includeVAT: part.includeVAT
        })),
        laborVAT: includeVATOnLabor
      }
    };

    if (editLog) {
      // Update existing maintenance log
      await updateDoc(doc(db, 'maintenanceLogs', editLog.id), {
        ...maintenanceData,
        updatedAt: new Date(),
        updatedBy: user.id
      });

      // Create finance transaction for new payment if any
      if (paidAmount > 0) {
        await createMaintenanceTransaction(
          {
            id: editLog.id,
            ...maintenanceData,
            vehicleId: selectedVehicleId,
            type: formData.type,
            cost: costs.totalAmount
          },
          selectedVehicle,
          paidAmount,
          paymentMethod,
          paymentReference
        );
      }

      toast.success('Maintenance updated successfully');
    } else {
      // Create new maintenance log
      const docRef = await addDoc(collection(db, 'maintenanceLogs'), {
        ...maintenanceData,
        createdAt: new Date(),
        createdBy: user.id,
        updatedAt: new Date()
      });

      // Create initial finance transaction if payment made
      if (paidAmount > 0) {
        await createMaintenanceTransaction(
          {
            id: docRef.id,
            ...maintenanceData,
            vehicleId: selectedVehicleId,
            type: formData.type,
            cost: costs.totalAmount
          },
          selectedVehicle,
          paidAmount,
          paymentMethod,
          paymentReference
        );
      }

      toast.success('Maintenance scheduled successfully');
    }

    onClose();
  } catch (error) {
    console.error('Error:', error);
    toast.error(editLog ? 'Failed to update maintenance' : 'Failed to schedule maintenance');
  } finally {
    setLoading(false);
  }
};



  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SearchableSelect
        label="Vehicle"
        options={vehicles.map(v => ({
          id: v.id,
          label: `${v.make} ${v.model}`,
          subLabel: v.registrationNumber
        }))}
        value={selectedVehicleId}
        onChange={setSelectedVehicleId}
        placeholder="Search vehicles by make, model or registration..."
        required
        disabled={!!editLog}
      />

<div>
  <label className="block text-sm font-medium text-gray-700">Type</label>
  <select
    value={formData.type}
    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
  >
    <option value="YEARLY-SERVICE">YEARLY SERVICE</option>
    <option value="MILEAGE-SERVICE">MILEAGE SERVICE</option>
    <option value="REPAIR">REPAIR</option>
    <option value="EMERGENCY-REPAIR">EMERGENCY REPAIR</option>
    <option value="MOT">MOT</option>
    <option value="NSL">NSL</option>
    <option value="TFL">TFL</option>
    <option value="SERVICE">SERVICE</option>
    <option value="MAINTENANCE">MAINTENANCE</option>
    <option value="BODYWORK">BODYWORK</option>
    <option value="ACCIDENT-REPAIR">ACCIDENT REPAIR</option>
  </select>
</div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Service Center</label>
          <ServiceCenterDropdown
            value={formData.serviceProvider}
            onChange={handleServiceCenterSelect}
            onInputChange={(value) => setFormData({ ...formData, serviceProvider: value })}
          />
        </div>

        <FormField
          type="number"
          label="Current Mileage"
          value={formData.currentMileage}
          onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value) })}
          required
          min="0"
        />

        <FormField
          type="number"
          label="Next Service Mileage"
          value={formData.nextServiceMileage}
          onChange={(e) => setFormData({ ...formData, nextServiceMileage: parseInt(e.target.value) })}
          required
          min={formData.currentMileage}
        />

        <FormField
          type="date"
          label="Next Service Date"
          value={formData.nextServiceDate}
          onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        />
      </div>

      {/* Parts Section */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Parts</label>
          <button
            type="button"
            onClick={() => setParts([...parts, { name: '', quantity: 1, cost: 0, includeVAT: false }])}
            className="text-sm text-primary hover:text-primary-600"
          >
            Add Part
          </button>
        </div>
        {parts.map((part, index) => (
          <div key={index} className="flex space-x-2 mb-2">
            <input
              type="text"
              value={part.name}
              onChange={(e) => {
                const newParts = [...parts];
                newParts[index] = { ...part, name: e.target.value };
                setParts(newParts);
              }}
              placeholder="Part name"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
            <input
              type="number"
              value={part.quantity}
              onChange={(e) => {
                const newParts = [...parts];
                newParts[index] = { ...part, quantity: parseInt(e.target.value) || 0 };
                setParts(newParts);
              }}
              placeholder="Qty"
              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              min="1"
            />
            <input
              type="number"
              value={part.cost}
              onChange={(e) => {
                const newParts = [...parts];
                newParts[index] = { ...part, cost: parseFloat(e.target.value) || 0 };
                setParts(newParts);
              }}
              placeholder="Cost"
              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              min="0"
              step="0.01"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={part.includeVAT}
                onChange={(e) => {
                  const newParts = [...parts];
                  newParts[index] = { ...part, includeVAT: e.target.checked };
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
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Labor Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Labor</label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={formData.laborHours}
            onChange={(e) => setFormData({ ...formData, laborHours: parseFloat(e.target.value) || 0 })}
            placeholder="Hours"
            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            step="0.5"
          />
          <span className="py-2">×</span>
          <input
            type="number"
            value={formData.laborRate}
            onChange={(e) => setFormData({ ...formData, laborRate: parseFloat(e.target.value) || 0 })}
            placeholder="Rate/hour"
            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            step="0.01"
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeVATOnLabor}
              onChange={(e) => setIncludeVATOnLabor(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">+VAT</span>
          </label>
          <span className="py-2">= £{costs.laborTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Section */}
<div className="border-t pt-4 space-y-4">
  <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
  
  <div className="grid grid-cols-2 gap-4">
  <FormField
  type="number"
  step="0.01"
  label="Amount to Pay"
  value={paidAmount}
  onChange={handlePaidAmountChange}
  required
/>


    <div>
      <label className="block text-sm font-medium text-gray-700">Payment Method</label>
      <select
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
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
        onChange={(e) => setPaymentReference(e.target.value)}
        placeholder="Enter payment reference or transaction ID"
      />
    </div>
  </div>

  {/* Cost Summary */}
<div className="bg-gray-50 p-4 rounded-lg space-y-2">
  {/* NET Amount */}
  <div className="flex justify-between text-sm font-medium">
    <span>NET Amount:</span>
    <span>£{costs.netAmount.toFixed(2)}</span>
  </div>

  {/* VAT Amount */}
  <div className="flex justify-between text-sm text-gray-600">
    <span>VAT (20%):</span>
    <span>£{costs.vatAmount.toFixed(2)}</span>
  </div>

  {/* Total Amount */}
  <div className="flex justify-between text-lg font-bold pt-2 border-t">
    <span>Total Amount:</span>
    <span>£{costs.totalAmount.toFixed(2)}</span>
  </div>

  {/* Payment Status */}
  <div className="pt-4 border-t space-y-2">
    <div className="flex justify-between text-sm">
      <span>Amount Paid:</span>
      <span className="text-green-600">£{paidAmount.toFixed(2)}</span>
    </div>
    {remainingAmount > 0 && (
      <div className="flex justify-between text-sm">
        <span>Remaining Amount:</span>
        <span className="text-amber-600">£{remainingAmount.toFixed(2)}</span>
      </div>
    )}
    <div className="flex justify-between text-sm pt-2 border-t">
      <span>Payment Status:</span>
      <span className="font-medium capitalize">{paymentStatus.replace('_', ' ')}</span>
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
          {loading ? 'Saving...' : editLog ? 'Update Maintenance' : 'Schedule Maintenance'}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceForm;