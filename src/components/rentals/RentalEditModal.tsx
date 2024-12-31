import React, { useState } from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import VehicleSelect from './RentalForm/VehicleSelect';
import toast from 'react-hot-toast';
import SignaturePad from '../ui/SignaturePad';
interface RentalEditModalProps {
  rental: Rental;
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalEditModal: React.FC<RentalEditModalProps> = ({ 
  rental, 
  vehicles,
  customers,
  onClose 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: rental.vehicleId,
    customerId: rental.customerId,
    startDate: new Date(rental.startDate).toISOString().split('T')[0],
    startTime: new Date(rental.startDate).toTimeString().slice(0, 5),
    endDate: new Date(rental.endDate).toISOString().split('T')[0],
    endTime: new Date(rental.endDate).toTimeString().slice(0, 5),
    type: rental.type,
    reason: rental.reason,
    numberOfWeeks: rental.numberOfWeeks || 1,
    paidAmount: rental.paidAmount || 0,
    paymentMethod: rental.paymentMethod || 'cash',
    paymentReference: rental.paymentReference || '',
    customRate: rental.negotiated ? rental.cost.toString() : '',
    signature: rental.signature || '',
    negotiationNotes: rental.negotiationNotes || ''
  });

  // Calculate total cost
  const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
  const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
  
  const totalCost = formData.customRate ? 
    parseFloat(formData.customRate) : 
    calculateRentalCost(startDateTime, endDateTime, formData.type, formData.reason);

  const remainingAmount = Math.max(0, totalCost - formData.paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Validate signature
    if (!formData.signature) {
      toast.error('Customer signature is required');
      return;
    }

    setLoading(true);

    try {
      const rentalRef = doc(db, 'rentals', rental.id);
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      const selectedCustomer = customers.find(c => c.id === formData.customerId);

      if (!selectedVehicle || !selectedCustomer) {
        throw new Error('Vehicle or customer not found');
      }

      const updatedRental = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
        cost: totalCost,
        remainingAmount,
        paymentStatus: formData.paidAmount >= totalCost ? 'paid' : 'pending',
        negotiated: !!formData.customRate,
        updatedAt: new Date(),
        updatedBy: user.id
      };

      await updateDoc(rentalRef, updatedRental);

      // Regenerate documents if needed
      if (rental.documents) {
        const documents = await generateRentalDocuments(
          { ...rental, ...updatedRental },
          selectedVehicle,
          selectedCustomer
        );
        await uploadRentalDocuments(rental.id, documents);
      }

      toast.success('Rental updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating rental:', error);
      toast.error('Failed to update rental');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Selection - Disabled for existing rentals */}
      <VehicleSelect
        vehicles={vehicles}
        selectedVehicleId={formData.vehicleId}
        onSelect={() => {}}
        disabled={true}
      />

      {/* Customer Selection - Disabled for existing rentals */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Customer</label>
        <select
          value={formData.customerId}
          disabled={true}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-gray-100"
        >
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} - {customer.mobile}
            </option>
          ))}
        </select>
      </div>

      {/* Rental Details */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Start Date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
        />

        <FormField
          type="time"
          label="Start Time"
          value={formData.startTime}
          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          required
        />

        <FormField
          type="date"
          label="End Date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          required
          min={formData.startDate}
        />

        <FormField
          type="time"
          label="End Time"
          value={formData.endTime}
          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          required
        />
      </div>
      <div>
  <label className="block text-sm font-medium text-gray-700">Status</label>
  <select
    value={formData.status}
    onChange={(e) => setFormData({ ...formData, status: e.target.value as Rental['status'] })}
    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
    required
  >
    <option value="scheduled">Scheduled</option>
    <option value="active">Active</option>
    <option value="completed">Completed</option>
    <option value="cancelled">Cancelled</option>
  </select>
</div>

      {/* Payment Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="number"
            label="Amount Paid"
            value={formData.paidAmount}
            onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) })}
            min="0"
            max={totalCost}
            step="0.01"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as typeof formData.paymentMethod })}
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
              value={formData.paymentReference}
              onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
              placeholder="Enter payment reference or transaction ID"
            />
          </div>
        </div>

        {/* Payment Summary */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Amount:</span>
            <span className="font-medium">£{totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-600">£{formData.paidAmount.toFixed(2)}</span>
          </div>
          {remainingAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>Remaining Amount:</span>
              <span className="text-amber-600">£{remainingAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Payment Status:</span>
            <span className="font-medium capitalize">
              {formData.paidAmount >= totalCost ? 'Paid' : 
               formData.paidAmount > 0 ? 'Partially Paid' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

       {/* Add Signature Capture before the form actions */}
       <div>
        <label className="block text-sm font-medium text-gray-700">Customer Signature</label>
        <SignaturePad
          value={formData.signature}
          onChange={(signature) => setFormData({ ...formData, signature })}
          className="mt-1 border rounded-md"
        />
        {formData.signature && (
          <p className="mt-1 text-sm text-gray-500">Signature captured</p>
        )}
      </div>

      {/* Form Actions */}
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
          {loading ? 'Updating...' : 'Update Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalEditModal;