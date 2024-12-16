import React, { useState, useEffect } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle } from '../../types';
import { addYears } from 'date-fns';
import toast from 'react-hot-toast';
import VehicleSelect from '../VehicleSelect';
import ServiceCenterDropdown from './ServiceCenterDropdown';
import FormField from '../ui/FormField';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { createMileageHistoryRecord } from '../../utils/mileageUtils';

const VAT_RATE = 0.20; // 20% VAT

interface AdditionalCharge {
  description: string;
  amount: number;
  includeVAT: boolean;
}

interface VehicleTestFormProps {
  vehicles: Vehicle[];
  onClose: () => void;
}

const VehicleTestForm: React.FC<VehicleTestFormProps> = ({ vehicles, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);
  const [includeVATOnTest, setIncludeVATOnTest] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'mot',
    testCenter: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    cost: 0,
    currentMileage: 0,
  });

  // Update mileage when vehicle is selected
  useEffect(() => {
    if (selectedVehicleId) {
      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (selectedVehicle) {
        setFormData(prev => ({
          ...prev,
          currentMileage: selectedVehicle.mileage
        }));
      }
    }
  }, [selectedVehicleId, vehicles]);

  const handleServiceCenterSelect = (center: {
    name: string;
    address: string;
    postcode: string;
    hourlyRate: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      testCenter: center.name,
      location: `${center.address}, ${center.postcode}`,
    }));
  };

  const handleAddCharge = () => {
    setAdditionalCharges([
      ...additionalCharges,
      { description: '', amount: 0, includeVAT: false }
    ]);
  };

  const handleChargeChange = (index: number, field: keyof AdditionalCharge, value: any) => {
    const newCharges = [...additionalCharges];
    newCharges[index] = { ...newCharges[index], [field]: value };
    setAdditionalCharges(newCharges);
  };

  const handleRemoveCharge = (index: number) => {
    setAdditionalCharges(additionalCharges.filter((_, i) => i !== index));
  };

  const calculateTotalCost = (): number => {
    const testCost = includeVATOnTest ? formData.cost * (1 + VAT_RATE) : formData.cost;
    
    const additionalTotal = additionalCharges.reduce((sum, charge) => {
      return sum + (charge.includeVAT ? charge.amount * (1 + VAT_RATE) : charge.amount);
    }, 0);

    return testCost + additionalTotal;
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
        description: `${formData.type.toUpperCase()} Test`,
        serviceProvider: formData.testCenter,
        location: formData.location,
        date: new Date(formData.date),
        currentMileage: formData.currentMileage,
        nextServiceDate: addYears(new Date(formData.date), 1),
        cost: calculateTotalCost(),
        status: 'scheduled' as const,
        additionalCharges,
        vatDetails: {
          testVAT: includeVATOnTest,
          additionalChargesVAT: additionalCharges.map(charge => ({
            description: charge.description,
            includeVAT: charge.includeVAT
          }))
        }
      };

      const docRef = await addDoc(collection(db, 'maintenanceLogs'), maintenanceData);

      // Create finance transaction
      await createFinanceTransaction({
        type: 'expense',
        category: 'vehicle-test',
        amount: calculateTotalCost(),
        description: `${formData.type.toUpperCase()} test fee`,
        referenceId: docRef.id,
        vehicleId: selectedVehicleId,
      });

      // Update mileage history if changed
      if (formData.currentMileage !== selectedVehicle.mileage) {
        await createMileageHistoryRecord(
          selectedVehicle,
          formData.currentMileage,
          'System',
          `Updated during ${formData.type.toUpperCase()} test`
        );
      }

      toast.success(`${formData.type.toUpperCase()} test scheduled successfully`);
      onClose();
    } catch (error) {
      console.error('Error scheduling test:', error);
      toast.error('Failed to schedule test');
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
        <label className="block text-sm font-medium text-gray-700">Test Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="mot">MOT Test</option>
          <option value="tfl">TfL License Test</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Test Center</label>
        <ServiceCenterDropdown
          value={formData.testCenter}
          onChange={handleServiceCenterSelect}
          onInputChange={(value) => setFormData({ ...formData, testCenter: value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Location</label>
        <input
          type="text"
          value={formData.location}
          readOnly
          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        />
      </div>

      <FormField
        type="date"
        label="Test Date"
        value={formData.date}
        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        required
      />

      <FormField
        type="number"
        label="Current Mileage"
        value={formData.currentMileage}
        onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value) })}
        required
        min="0"
      />

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Test Cost (£)</label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeVATOnTest}
              onChange={(e) => setIncludeVATOnTest(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-600">+VAT</span>
          </label>
        </div>
        <input
          type="number"
          value={formData.cost}
          onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
          min="0"
          step="0.01"
        />
      </div>

      {/* Additional Charges */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Additional Charges</label>
          <button
            type="button"
            onClick={handleAddCharge}
            className="px-2 py-1 text-sm text-primary hover:bg-primary-50 rounded-md"
          >
            Add Charge
          </button>
        </div>
        {additionalCharges.map((charge, index) => (
          <div key={index} className="flex space-x-2 mb-2">
            <input
              type="text"
              value={charge.description}
              onChange={(e) => handleChargeChange(index, 'description', e.target.value)}
              placeholder="Description"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            />
            <input
              type="number"
              value={charge.amount}
              onChange={(e) => handleChargeChange(index, 'amount', parseFloat(e.target.value))}
              placeholder="Amount"
              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              min="0"
              step="0.01"
            />
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={charge.includeVAT}
                onChange={(e) => handleChargeChange(index, 'includeVAT', e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-600">+VAT</span>
            </label>
            <button
              type="button"
              onClick={() => handleRemoveCharge(index)}
              className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Cost Summary */}
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Test Cost:</span>
          <span>£{(includeVATOnTest ? formData.cost * (1 + VAT_RATE) : formData.cost).toFixed(2)}</span>
        </div>
        {additionalCharges.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Additional Charges:</span>
            <span>£{additionalCharges.reduce((sum, charge) => {
              return sum + (charge.includeVAT ? charge.amount * (1 + VAT_RATE) : charge.amount);
            }, 0).toFixed(2)}</span>
          </div>
        )}
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
          {loading ? 'Scheduling...' : 'Schedule Test'}
        </button>
      </div>
    </form>
  );
};

export default VehicleTestForm;