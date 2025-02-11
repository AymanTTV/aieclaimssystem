import React, { useState } from 'react';
import { MaintenanceLog, Vehicle } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateCosts } from '../../utils/maintenanceCostUtils';
import { createMaintenanceTransaction } from '../../utils/financeTransactions';

import { createFinanceTransaction } from '../../utils/financeTransactions';

import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import ServiceCenterDropdown from './ServiceCenterDropdown';
import toast from 'react-hot-toast';
import { formatDateForInput, ensureValidDate } from '../../utils/dateHelpers';
import { addYears } from 'date-fns';

interface MaintenanceEditModalProps {
  log: MaintenanceLog;
  vehicles: Vehicle[];
  onClose: () => void;
}

const MaintenanceEditModal: React.FC<MaintenanceEditModalProps> = ({ log, vehicles, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState<(Part & { includeVAT: boolean })[]>(
    log.parts.map(part => ({
      ...part,
      includeVAT: log.vatDetails?.partsVAT.find(v => v.partName === part.name)?.includeVAT || false
    })) || []
  );
  const [includeVATOnLabor, setIncludeVATOnLabor] = useState(log.vatDetails?.laborVAT || false);
  const [paidAmount, setPaidAmount] = useState(log.paidAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState(log.paymentMethod || 'cash');
  const [paymentReference, setPaymentReference] = useState(log.paymentReference || '');

  const [formData, setFormData] = useState({
    type: log.type,
    description: log.description,
    serviceProvider: log.serviceProvider,
    location: log.location,
    date: formatDateForInput(log.date),
    currentMileage: log.currentMileage,
    laborHours: log.laborHours,
    laborRate: log.laborRate,
    nextServiceMileage: log.nextServiceMileage,
    nextServiceDate: formatDateForInput(log.nextServiceDate) || formatDateForInput(addYears(log.date, 1)),
    notes: log.notes || '',
    status: log.status,
  });

  const costs = calculateCosts(parts, formData.laborHours, formData.laborRate, includeVATOnLabor);
  const remainingAmount = costs.totalAmount - paidAmount;
  const paymentStatus = paidAmount >= costs.totalAmount ? 'paid' : 
                       paidAmount > 0 ? 'partially_paid' : 'unpaid';

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!user) return;
  setLoading(true);

  try {
    const docRef = doc(db, 'maintenanceLogs', log.id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Maintenance log not found');
    }

    const selectedVehicle = vehicles.find(v => v.id === log.vehicleId);
    if (!selectedVehicle) throw new Error('Vehicle not found');

    // Calculate new payment amounts
    const amountToPay = parseFloat(formData.amountToPay || '0') || 0;
    const totalPaidAmount = log.paidAmount + amountToPay;
    const remainingAmount = costs.totalAmount - totalPaidAmount;
    const paymentStatus = totalPaidAmount >= costs.totalAmount ? 'paid' : 
                         totalPaidAmount > 0 ? 'partially_paid' : 'unpaid';

    // Update maintenance log
    const maintenanceData = {
      ...formData,
      paidAmount: totalPaidAmount,
      remainingAmount,
      paymentStatus,
      updatedAt: new Date(),
      updatedBy: user.id
    };

    await updateDoc(docRef, maintenanceData);

    // Create finance transaction for new payment if amount is paid
    if (amountToPay > 0) {
      await createMaintenanceTransaction(
        {
          id: log.id,
          ...maintenanceData,
          vehicleId: log.vehicleId,
          type: log.type,
          cost: costs.totalAmount
        },
        selectedVehicle,
        amountToPay,
        formData.paymentMethod,
        formData.paymentReference
      );
    }

    toast.success('Maintenance log updated successfully');
    onClose();
  } catch (error) {
    console.error('Error updating maintenance log:', error);
    toast.error('Failed to update maintenance log');
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
              value={log.vehicleId}
              onChange={() => {}}
              placeholder="Search vehicles by make, model or registration..."
              disabled={true}
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
            onChange={(center) => {
              setFormData({
                ...formData,
                serviceProvider: center.name,
                location: `${center.address}, ${center.postcode}`,
                laborRate: center.hourlyRate
              });
            }}
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
            label="Amount Paid"
            value={paidAmount}
            onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
            min="0"
            max={costs.totalAmount}
            step="0.01"
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

        {/* Payment Section */}
<div className="border-t pt-4 space-y-4">
  <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
  
  <div className="grid grid-cols-2 gap-4">
    <FormField
      type="number"
      label="Amount Paid"
      value={paidAmount}
      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
      min="0"
      max={costs.totalAmount}
      step="0.01"
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
          {loading ? 'Updating...' : 'Update Maintenance'}
        </button>
      </div>
    </form>
  );
};

export default MaintenanceEditModal;

