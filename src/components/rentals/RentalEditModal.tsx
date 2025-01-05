import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import SignaturePad from '../ui/SignaturePad';
import RentalPaymentHistory from './RentalPaymentHistory';
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
    amountToPay: '0',
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    customRate: rental.negotiated ? rental.cost.toString() : '',
    negotiationNotes: rental.negotiationNotes || '',
    signature: rental.signature || ''
  });

  // Calculate if user can negotiate rates
  const canNegotiate = user?.role === 'admin' || user?.role === 'manager';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
      
      // Calculate costs
      const standardCost = calculateRentalCost(
        startDateTime,
        endDateTime,
        formData.type,
        formData.reason,
        formData.numberOfWeeks
      );

      const finalCost = formData.customRate ? parseFloat(formData.customRate) : standardCost;
      const amountToPay = parseFloat(formData.amountToPay) || 0;
      const newPaidAmount = rental.paidAmount + amountToPay;
      const newRemainingAmount = finalCost - newPaidAmount;

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
      await updateDoc(rentalRef, {
        startDate: startDateTime,
        endDate: endDateTime,
        type: formData.type,
        reason: formData.reason,
        numberOfWeeks: formData.numberOfWeeks,
        cost: finalCost,
        standardCost,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaidAmount >= finalCost ? 'paid' : 
                      newPaidAmount > 0 ? 'partially_paid' : 'pending',
        negotiated: !!formData.customRate,
        negotiationNotes: formData.negotiationNotes,
        signature: formData.signature,
        payments,
        updatedAt: new Date(),
        updatedBy: user.id
      });

      // Generate and upload new documents
      const selectedVehicle = vehicles.find(v => v.id === rental.vehicleId);
      const selectedCustomer = customers.find(c => c.id === rental.customerId);
      if (selectedVehicle && selectedCustomer) {
        const documents = await generateRentalDocuments(
          { ...rental, ...formData, cost: finalCost },
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

      {/* Rate Negotiation */}
      {canNegotiate && (
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-lg font-medium text-gray-900">Rate Negotiation</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Standard Rate</label>
              <p className="mt-1 text-lg font-medium">£{rental.standardCost?.toFixed(2)}</p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700">Negotiation Notes</label>
                <textarea
                  value={formData.negotiationNotes}
                  onChange={(e) => setFormData({ ...formData, negotiationNotes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="Enter reason for rate negotiation..."
                  required
                />
              </div>

              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Custom rate will be approved by {user?.name} ({user?.role})
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Payment Section */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
        
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Cost:</span>
            <span className="font-medium">£{rental.cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-600">£{rental.paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Remaining Amount:</span>
            <span className="text-amber-600">£{rental.remainingAmount.toFixed(2)}</span>
          </div>
        </div>

        {rental.remainingAmount > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              type="number"
              label="Amount to Pay"
              value={formData.amountToPay}
              onChange={(e) => setFormData({ ...formData, amountToPay: e.target.value })}
              min="0"
              max={rental.remainingAmount}
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

            <div className="col-span-2">
              <FormField
                label="Payment Reference"
                value={formData.paymentReference}
                onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                placeholder="Enter payment reference or transaction ID"
              />
            </div>

            <div className="col-span-2">
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
        )}

        {/* Payment History */}
        {rental.payments && rental.payments.length > 0 && (
          <RentalPaymentHistory 
            payments={rental.payments}
            onDownloadDocument={(url) => window.open(url, '_blank')}
          />
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