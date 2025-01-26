import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import SignaturePad from '../ui/SignaturePad';
import { addWeeks, isMonday, nextMonday, format, addDays, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/dateHelpers';
import { calculateOverdueCost } from '../../utils/rentalCalculations';


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
    status: rental.status,
    completionDate: rental.completionDate || '',
    numberOfWeeks: rental.numberOfWeeks || 1,
    amountToPay: '0',
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    customRate: rental.negotiated ? rental.cost.toString() : '',
    // negotiationNotes: rental.negotiationNotes || '',
    signature: rental.signature || '',
    negotiatedAmount: '',
    negotiationNotes: '',
  });

  // Calculate end date for weekly rentals
  useEffect(() => {
    if (formData.type === 'weekly' && formData.startDate) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      let endDateTime;

      if (!isMonday(startDateTime)) {
        // Calculate days until next Monday
        const firstMonday = nextMonday(startDateTime);
        // Add (numberOfWeeks - 1) * 7 days to the first Monday
        endDateTime = addDays(firstMonday, (formData.numberOfWeeks - 1) * 7);
      } else {
        // If starting on Monday, simply add numberOfWeeks * 7 days
        endDateTime = addDays(startDateTime, formData.numberOfWeeks * 7);
      }

      setFormData(prev => ({
        ...prev,
        endDate: endDateTime.toISOString().split('T')[0],
        endTime: formData.startTime
      }));
    }
  }, [formData.type, formData.numberOfWeeks, formData.startDate, formData.startTime]);

  const selectedVehicle = vehicles.find(v => v.id === rental.vehicleId);
  const selectedCustomer = customers.find(c => c.id === rental.customerId);

  // Calculate costs
  const calculateTotalCost = () => {
    if (!selectedVehicle) return 0;

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

    return calculateRentalCost(
      startDateTime,
      endDateTime,
      formData.type,
      selectedVehicle,
      formData.reason
    );
  };

  const totalCost = calculateTotalCost();
  const amountToPay = parseFloat(formData.amountToPay) || 0;
  const newPaidAmount = rental.paidAmount + amountToPay;
  const remainingAmount = totalCost - newPaidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      const completionDate = formData.completionDate ? new Date(formData.completionDate) : null;

      if (!selectedVehicle || !selectedCustomer) {
        throw new Error('Vehicle or customer not found');
      }

      // Calculate costs
      // Calculate costs
    const standardCost = calculateRentalCost(
      startDateTime,
      endDateTime,
      formData.type,
      selectedVehicle
    );

      const overdueCost = rental.status === 'active' && isAfter(new Date(), rental.endDate)
      ? calculateOverdueCost(rental, new Date(), selectedVehicle)
      : 0;

    // Use negotiated amount if provided and user has permission
    const finalCost = (formData.negotiatedAmount && ( user.role === 'manager'))
      ? parseFloat(formData.negotiatedAmount)
      : standardCost + overdueCost;

    const remainingAmount = finalCost - rental.paidAmount;

      // Create new payment record if amount to pay > 0
      const payments = [...(rental.payments || [])];
      if (amountToPay > 0) {
        payments.push({
          id: Date.now().toString(),
          date: new Date(),
          amount: amountToPay,
          method: formData.paymentMethod,
          reference: formData.paymentReference,
          notes: formData.paymentNotes,
          createdAt: new Date(),
          createdBy: user.id
        });
      }

      // Update rental record
      const rentalRef = doc(db, 'rentals', rental.id);
      const updateData = {
        startDate: startDateTime,
        endDate: endDateTime,
        type: formData.type,
        reason: formData.reason,
        status: formData.status,
        completionDate: formData.status === 'completed' ? formData.completionDate : null,
        numberOfWeeks: formData.numberOfWeeks,
        cost: finalCost,
        standardCost,
        paidAmount: newPaidAmount,
        remainingAmount,
        paymentStatus: newPaidAmount >= finalCost ? 'paid' : 
                      newPaidAmount > 0 ? 'partially_paid' : 'pending',
        negotiated: !!formData.negotiatedAmount,
      negotiationNotes: formData.negotiationNotes || null,
      approvedBy: formData.negotiatedAmount ? user.id : null,
        signature: formData.signature,
        payments,
        updatedAt: new Date(),
        updatedBy: user.id
      };

      await updateDoc(rentalRef, updateData);

      // Generate and upload new documents
      const documents = await generateRentalDocuments(
        { id: rental.id, ...updateData },
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
    {/* Vehicle and Customer Info (Read-only) */}
    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700">Vehicle</label>
        <div className="mt-1">
          {selectedVehicle ? (
            <div>
              <div className="font-medium">
                {selectedVehicle.make} {selectedVehicle.model}
              </div>
              <div className="text-sm text-gray-500">
                {selectedVehicle.registrationNumber}
              </div>
            </div>
          ) : 'N/A'}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Customer</label>
        <div className="mt-1">
          {selectedCustomer ? (
            <div>
              <div className="font-medium">{selectedCustomer.name}</div>
              <div className="text-sm text-gray-500">{selectedCustomer.mobile}</div>
            </div>
          ) : 'N/A'}
        </div>
      </div>
    </div>

    {/* Rental Details */}
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

      {/* Status Field */}
    <div>
      <label className="block text-sm font-medium text-gray-700">Status</label>
      <select
        value={formData.status}
        onChange={(e) =>
          setFormData({ ...formData, status: e.target.value as typeof formData.status })
        }
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        required
      >
        <option value="scheduled">Scheduled</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    {/* Conditional Completion Date Field */}
    {formData.status === 'completed' && (
      <FormField
        type="date"
        label="Completion Date"
        value={formData.completionDate}
        onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
        required={formData.status === 'completed'}
        min={formData.startDate}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
      />
    )}


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

      {formData.type === 'weekly' ? (
        <FormField
          type="number"
          label="Number of Weeks"
          value={formData.numberOfWeeks}
          onChange={(e) => setFormData({ ...formData, numberOfWeeks: parseInt(e.target.value) })}
          min="1"
          required
        />
      ) : (
        <>
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
        </>
      )}
    </div>

    {/* Payment Details */}
    <div className="space-y-4 border-t pt-4">
      <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
      
      <FormField
        type="number"
        label="Amount to Pay"
        value={formData.amountToPay}
        onChange={(e) => setFormData({ ...formData, amountToPay: e.target.value })}
        min="0"
        step="0.01"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>

      <FormField
        label="Payment Reference"
        value={formData.paymentReference}
        onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
        placeholder="Enter payment reference or transaction ID"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Payment Notes</label>
        <textarea
          value={formData.paymentNotes}
          onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
          rows={2}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Add any notes about this payment"
        />
      </div>
    </div>
    {/* Payment Summary & Negotiation Section */}
<div className="border-t pt-6">
  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Summary</h3>
  
  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
    {/* Base Cost */}
    <div className="flex justify-between items-center">
      <span className="text-gray-600">Base Cost</span>
      <span className="font-medium">£{rental.cost.toFixed(2)}</span>
    </div>

    {/* Ongoing Charges */}
    {rental.status === 'active' && isAfter(new Date(), rental.endDate) && (
      <div className="flex justify-between items-center text-red-600">
        <span>Ongoing Charges</span>
        <span>+£{calculateOverdueCost(rental, new Date(), selectedVehicle).toFixed(2)}</span>
      </div>
    )}

    {/* Total Cost */}
    <div className="flex justify-between items-center pt-2 border-t">
      <span className="text-gray-600">Total Cost</span>
      <span className="font-medium">
        £{(rental.cost + (rental.status === 'active' ? calculateOverdueCost(rental, new Date(), selectedVehicle) : 0)).toFixed(2)}
      </span>
    </div>

    {/* Amount Paid */}
    <div className="flex justify-between items-center">
      <span className="text-gray-600">Amount Paid</span>
      <span className="text-green-600">£{rental.paidAmount.toFixed(2)}</span>
    </div>

    {/* Remaining Amount */}
    <div className="flex justify-between items-center">
      <span className="text-gray-600">Remaining Amount</span>
      <span className="text-amber-600">
        £{(rental.cost + (rental.status === 'active' ? calculateOverdueCost(rental, new Date(), selectedVehicle) : 0) - rental.paidAmount).toFixed(2)}
      </span>
    </div>
  </div>

  {/* Negotiation Section - Only visible for managers */}
  {(user?.role === 'admin' || user?.role === 'manager') && (
    <div className="mt-6 space-y-4">
      <h4 className="text-md font-medium text-gray-900">Price Negotiation</h4>
      
      <FormField
        type="number"
        label="Negotiated Amount (Optional)"
        value={formData.negotiatedAmount}
        onChange={(e) => setFormData({ ...formData, negotiatedAmount: e.target.value })}
        min="0"
        step="0.01"
        placeholder="Enter negotiated amount"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700">Negotiation Notes</label>
        <textarea
          value={formData.negotiationNotes}
          onChange={(e) => setFormData({ ...formData, negotiationNotes: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          placeholder="Enter reason for price negotiation"
          required={!!formData.negotiatedAmount}
        />
      </div>

      {formData.negotiatedAmount && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Negotiated price will be approved by {user.name} ({user.role})
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
</div>

    {/* Customer Signature */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Customer Signature</label>
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
