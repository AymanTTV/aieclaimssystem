import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost, calculateOverdueCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import SignaturePad from '../ui/SignaturePad';
import { addWeeks, isMonday, nextMonday, isAfter } from 'date-fns';
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
  const [ongoingCharges, setOngoingCharges] = useState(0);

  const [formData, setFormData] = useState({
    startDate: new Date(rental.startDate).toISOString().split('T')[0],
    startTime: new Date(rental.startDate).toTimeString().slice(0, 5),
    endDate: new Date(rental.endDate).toISOString().split('T')[0],
    endTime: new Date(rental.endDate).toTimeString().slice(0, 5),
    type: rental.type,
    reason: rental.reason,
    status: rental.status,
    numberOfWeeks: rental.numberOfWeeks || 1,
    amountToPay: '0',
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    customRate: rental.negotiated ? rental.cost.toString() : '',
    negotiationNotes: rental.negotiationNotes || '',
    signature: rental.signature || ''
  });

  // Calculate ongoing charges if rental is active and past end date
  useEffect(() => {
    const selectedVehicle = vehicles.find(v => v.id === rental.vehicleId);
    if (selectedVehicle && rental.status === 'active') {
      const endDate = new Date(rental.endDate);
      const now = new Date();
      if (isAfter(now, endDate)) {
        const extraCharges = calculateOverdueCost(rental, now, selectedVehicle);
        setOngoingCharges(extraCharges);
      }
    }
  }, [rental, vehicles]);

  // Update end date when type or number of weeks changes
  useEffect(() => {
    if (formData.type === 'weekly') {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      let endDateTime;

      if (!isMonday(startDateTime)) {
        const firstMonday = nextMonday(startDateTime);
        endDateTime = addWeeks(firstMonday, formData.numberOfWeeks - 1);
      } else {
        endDateTime = addWeeks(startDateTime, formData.numberOfWeeks);
      }

      setFormData(prev => ({
        ...prev,
        endDate: endDateTime.toISOString().split('T')[0],
        endTime: formData.startTime
      }));
    }
  }, [formData.type, formData.numberOfWeeks]);

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

  const totalCost = calculateTotalCost() + ongoingCharges;
  const amountToPay = parseFloat(formData.amountToPay) || 0;
  const newPaidAmount = rental.paidAmount + amountToPay;
  const remainingAmount = totalCost - newPaidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    // Validate number of weeks
  if (formData.type === 'weekly' && (!formData.numberOfWeeks || formData.numberOfWeeks < 1)) {
    toast.error('Number of weeks must be at least 1');
    return;
  }

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      if (!selectedVehicle || !selectedCustomer) {
        throw new Error('Vehicle or customer not found');
      }

      // Calculate costs
      const standardCost = calculateRentalCost(
        startDateTime,
        endDateTime,
        formData.type,
        selectedVehicle,
        formData.reason
      );

      const finalCost = formData.customRate ? parseFloat(formData.customRate) : standardCost + ongoingCharges;

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
        numberOfWeeks: formData.numberOfWeeks,
        cost: finalCost,
        standardCost,
        ongoingCharges,
        paidAmount: newPaidAmount,
        remainingAmount,
        paymentStatus: newPaidAmount >= finalCost ? 'paid' : 
                      newPaidAmount > 0 ? 'partially_paid' : 'pending',
        negotiated: !!formData.customRate,
        negotiationNotes: formData.negotiationNotes,
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

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as typeof formData.status })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          >
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {formData.type === 'weekly' ? (
          <>
            <FormField
              type="number"
              label="Number of Weeks"
              value={formData.numberOfWeeks}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1) {
                  setFormData({ ...formData, numberOfWeeks: value });
                }
              }}
              min="1"
              step="1"
              required
              onBlur={(e) => {
                if (!e.target.value) {
                  setFormData({ ...formData, numberOfWeeks: 1 });
                }
              }}
            />

            <FormField
              type="date"
              label="End Date"
              value={formData.endDate}
              disabled
              required
            />
            <FormField
              type="time"
              label="End Time"
              value={formData.endTime}
              disabled
              required
            />
          </>
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

      {/* Cost Summary */}
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span>Base Cost:</span>
          <span className="font-medium">£{calculateTotalCost().toFixed(2)}</span>
        </div>
        {ongoingCharges > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Ongoing Charges:</span>
            <span>+£{ongoingCharges.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-medium pt-2 border-t">
          <span>Total Cost:</span>
          <span>£{totalCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Amount Paid:</span>
          <span className="text-green-600">£{rental.paidAmount.toFixed(2)}</span>
        </div>
        {amountToPay > 0 && (
          <div className="flex justify-between text-sm">
            <span>New Payment:</span>
            <span className="text-blue-600">£{amountToPay.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>Remaining Amount:</span>
          <span className="text-amber-600">£{remainingAmount.toFixed(2)}</span>
        </div>
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