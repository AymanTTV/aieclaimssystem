import React, { useState } from 'react';
import { Rental, Vehicle, Customer } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import FormField from '../ui/FormField';
import SearchableSelect from './SearchableSelect';
import SignaturePad from '../ui/SignaturePad';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';

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
    negotiationNotes: rental.negotiationNotes || '',
    signature: rental.signature || '',
    status: rental.status
  });

  // Calculate total cost
  const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
  const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
  
  const standardCost = calculateRentalCost(
    startDateTime,
    endDateTime,
    formData.type,
    formData.reason,
    formData.numberOfWeeks
  );

  const totalCost = formData.customRate ? 
    parseFloat(formData.customRate) : 
    standardCost;

  const remainingAmount = formData.paidAmount >= totalCost ? 0 : totalCost - formData.paidAmount;
  const canNegotiate = user?.role === 'admin' || user?.role === 'manager';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate negotiated rate
    if (formData.customRate) {
      const negotiatedAmount = parseFloat(formData.customRate);
      if (negotiatedAmount <= 0) {
        toast.error('Negotiated rate must be greater than 0');
        return;
      }
      if (!formData.negotiationNotes) {
        toast.error('Please provide negotiation notes');
        return;
      }
    }

    setLoading(true);

    try {
      const selectedVehicle = vehicles.find(v => v.id === rental.vehicleId);
      const selectedCustomer = customers.find(c => c.id === rental.customerId);

      if (!selectedVehicle || !selectedCustomer) {
        throw new Error('Vehicle or customer not found');
      }

      const rentalData = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
        cost: totalCost,
        standardCost: formData.customRate ? standardCost : undefined,
        remainingAmount,
        paymentStatus: formData.paidAmount >= totalCost ? 'paid' : 'pending',
        negotiated: !!formData.customRate,
        updatedAt: new Date(),
        updatedBy: user.id
      };

      // Update rental record
      await updateDoc(doc(db, 'rentals', rental.id), rentalData);

      // Create or update financial transaction
      if (formData.paidAmount !== rental.paidAmount) {
        await createFinanceTransaction({
          type: 'income',
          category: 'rental',
          amount: formData.paidAmount,
          description: `Rental payment update for ${selectedVehicle.make} ${selectedVehicle.model}`,
          referenceId: rental.id,
          vehicleId: selectedVehicle.id,
          vehicleName: `${selectedVehicle.make} ${selectedVehicle.model}`,
          vehicleOwner: selectedVehicle.owner || { name: 'AIE Skyline', isDefault: true },
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          status: 'completed'
        });
      }

      // Generate and upload new documents
      const documents = await generateRentalDocuments(
        { ...rental, ...rentalData },
        selectedVehicle,
        selectedCustomer
      );
      await uploadRentalDocuments(rental.id, documents);

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
      {/* Vehicle and Customer Selection - Disabled for existing rentals */}
      <SearchableSelect
        label="Vehicle"
        options={vehicles.map(v => ({
          id: v.id,
          label: `${v.make} ${v.model}`,
          subLabel: v.registrationNumber
        }))}
        value={rental.vehicleId}
        onChange={() => {}}
        disabled={true}
      />

      <SearchableSelect
        label="Customer"
        options={customers.map(c => ({
          id: c.id,
          label: c.name,
          subLabel: `${c.mobile} - ${c.email}`
        }))}
        value={rental.customerId}
        onChange={() => {}}
        disabled={true}
      />

      {/* Status Selection */}
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

      {/* Rental Type and Reason */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Rental Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="claim">Claim</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Reason</label>
          <select
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value as typeof formData.reason })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="hired">Hired</option>
            <option value="claim">Claim</option>
            <option value="o/d">O/D</option>
            <option value="staff">Staff</option>
            <option value="workshop">Workshop</option>
            <option value="c-substitute">C Substitute</option>
            <option value="h-substitute">H Substitute</option>
          </select>
        </div>
      </div>

      {/* Rental Period */}
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

      {/* Rate Negotiation */}
      {canNegotiate && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900">Rate Negotiation</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Standard Rate</label>
              <p className="mt-1 text-lg font-medium">£{standardCost.toFixed(2)}</p>
            </div>

            <FormField
              type="number"
              label="Negotiated Rate (Optional)"
              value={formData.customRate}
              onChange={(e) => setFormData({ ...formData, customRate: e.target.value })}
              min="0"
              step="0.01"
              placeholder="Enter custom rate"
            />
          </div>

          {formData.customRate && (
            <>
              <TextArea
                label="Negotiation Notes"
                value={formData.negotiationNotes}
                onChange={(e) => setFormData({ ...formData, negotiationNotes: e.target.value })}
                placeholder="Enter reason for rate negotiation..."
                required
              />

              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Custom rate will be approved by {user.name} ({user.role})
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Payment Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="number"
            label="Amount Paid"
            value={formData.paidAmount}
            onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
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
            <span>Standard Rate:</span>
            <span className="font-medium">£{standardCost.toFixed(2)}</span>
          </div>
          {formData.customRate && (
            <div className="flex justify-between text-sm text-primary">
              <span>Negotiated Rate:</span>
              <span className="font-medium">£{formData.customRate}</span>
            </div>
          )}
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
            <div>
            <span className="font-medium capitalize">
              {formData.paidAmount >= totalCost ? 'Paid' : 
               formData.paidAmount > 0 ? 'Partially Paid' : 'Pending'}
            </span>
          </div>

          </div>
        </div>
      </div>

      {/* Signature Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {formData.signature ? 'Customer Signature (Existing)' : 'Add Customer Signature'}
        </label>
        <SignaturePad
          value={formData.signature}
          onChange={(signature) => setFormData({ ...formData, signature })}
          className="mt-1 border rounded-md"
        />
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