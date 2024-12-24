import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, MaintenanceLog, Part } from '../../types';
import { addYears } from 'date-fns';
import { formatDateForInput, ensureValidDate } from '../../utils/dateHelpers';
import toast from 'react-hot-toast';
import VehicleSelect from '../VehicleSelect';
import ServiceCenterDropdown from './ServiceCenterDropdown';
import FormField from '../ui/FormField';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { createMileageHistoryRecord } from '../../utils/mileageUtils';
import { usePermissions } from '../../hooks/usePermissions';

const VAT_RATE = 0.20; // 20% VAT

interface MaintenanceFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
  editLog?: MaintenanceLog;
}

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ vehicles, onClose, editLog }) => {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(editLog?.vehicleId || '');
  const [parts, setParts] = useState<(Part & { includeVAT: boolean })[]>(
    editLog?.parts.map(part => ({ ...part, includeVAT: false })) || []
  );
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(false);
  
  const [formData, setFormData] = useState({
    type: editLog?.type || 'yearly-service',
    description: editLog?.description || '',
    serviceProvider: editLog?.serviceProvider || '',
    location: editLog?.location || '',
    date: formatDateForInput(editLog?.date),
    currentMileage: editLog?.currentMileage || 0,
    laborHours: editLog?.laborCost ? editLog.laborCost / 75 : 0,
    laborRate: 75,
    nextServiceMileage: editLog?.nextServiceMileage || 0,
    nextServiceDate: formatDateForInput(editLog?.nextServiceDate),
    notes: editLog?.notes || '',
    status: editLog?.status || 'scheduled',
  });

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

  if (!can('maintenance', editLog ? 'update' : 'create')) {
    return <div>You don't have permission to {editLog ? 'edit' : 'schedule'} maintenance.</div>;
  }

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

  const handleAddPart = () => {
    setParts([...parts, { name: '', quantity: 1, cost: 0, includeVAT: false }]);
  };

  const handlePartChange = (index: number, field: keyof (Part & { includeVAT: boolean }), value: any) => {
    const newParts = [...parts];
    newParts[index] = { ...newParts[index], [field]: value };
    setParts(newParts);
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const calculatePartsCost = (): number => {
    return parts.reduce((sum, part) => {
      const partCost = part.cost * part.quantity;
      return sum + (part.includeVAT ? partCost * (1 + VAT_RATE) : partCost);
    }, 0);
  };

  const calculateLaborCost = (): number => {
    const baseCost = formData.laborHours * formData.laborRate;
    return includeVATOnLabor ? baseCost * (1 + VAT_RATE) : baseCost;
  };

  const calculateTotalCost = (): number => {
    return calculatePartsCost() + calculateLaborCost();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
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
        date: ensureValidDate(formData.date),
        currentMileage: formData.currentMileage,
        nextServiceMileage: formData.nextServiceMileage,
        nextServiceDate: ensureValidDate(formData.nextServiceDate || addYears(new Date(formData.date), 1)),
        parts: parts.map(({ includeVAT, ...part }) => part),
        laborCost: calculateLaborCost(),
        cost: calculateTotalCost(),
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
        await updateDoc(doc(db, 'maintenanceLogs', editLog.id), maintenanceData);
      } else {
        const docRef = await addDoc(collection(db, 'maintenanceLogs'), maintenanceData);

        await createFinanceTransaction({
          type: 'expense',
          category: 'maintenance',
          amount: calculateTotalCost(),
          description: `Maintenance cost for ${formData.description}`,
          referenceId: docRef.id,
          vehicleId: selectedVehicleId,
        });

        if (formData.currentMileage !== selectedVehicle.mileage) {
          await createMileageHistoryRecord(
            selectedVehicle,
            formData.currentMileage,
            'System',
            'Updated during maintenance'
          );
        }
      }

      toast.success(editLog ? 'Maintenance log updated successfully' : 'Maintenance scheduled successfully');
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error(editLog ? 'Failed to update maintenance log' : 'Failed to schedule maintenance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <VehicleSelect
        vehicles={vehicles}
        selectedVehicleId={selectedVehicleId}
        onSelect={setSelectedVehicleId}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="yearly-service">Yearly Service</option>
          <option value="mileage-service">Mileage Service</option>
          <option value="repair">Repair</option>
          <option value="emergency-repair">Emergency Repair</option>
          <option value="mot">MOT Test</option>
          <option value="tfl">TfL Test</option>
        </select>
      </div>

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

      <div className="grid grid-cols-2 gap-4">
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

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Parts</label>
          <button
            type="button"
            onClick={handleAddPart}
            className="px-2 py-1 text-sm text-primary hover:bg-primary-50 rounded-md"
          >
            Add Part
          </button>
        </div>
        {parts.map((part, index) => (
          <div key={index} className="flex space-x-2 mb-2">
            <input
              type="text"
              value={part.name}
              onChange={(e) => handlePartChange(index, 'name', e.target.value)}
              placeholder="Part name"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
            <input
              type="number"
              value={part.quantity}
              onChange={(e) => handlePartChange(index, 'quantity', parseInt(e.target.value))}
              placeholder="Qty"
              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              min="1"
            />
            <input
              type="number"
              value={part.cost}
              onChange={(e) => handlePartChange(index, 'cost', parseFloat(e.target.value))}
              placeholder="Cost"
              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              min="0"
              step="0.01"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={part.includeVAT}
                onChange={(e) => handlePartChange(index, 'includeVAT', e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">+VAT</span>
            </label>
            <button
              type="button"
              onClick={() => handleRemovePart(index)}
              className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Labor</label>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={formData.laborHours}
            onChange={(e) => setFormData({ ...formData, laborHours: parseFloat(e.target.value) })}
            placeholder="Hours"
            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            min="0"
            step="0.5"
          />
          <span className="py-2">×</span>
          <input
            type="number"
            value={formData.laborRate}
            onChange={(e) => setFormData({ ...formData, laborRate: parseFloat(e.target.value) })}
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
          <span className="py-2">= £{calculateLaborCost().toFixed(2)}</span>
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Parts Total (inc. VAT where applicable):</span>
          <span>£{calculatePartsCost().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Labor Total (inc. VAT where applicable):</span>
          <span>£{calculateLaborCost().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-medium">
          <span>Total Cost:</span>
          <span>£{calculateTotalCost().toFixed(2)}</span>
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