import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Rental, Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import SignaturePad from '../ui/SignaturePad';
import { addWeeks, format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import { createFinanceTransaction } from '../../utils/financeTransactions';

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
    startDate: format(rental.startDate, 'yyyy-MM-dd'),
    startTime: format(rental.startDate, 'HH:mm'),
    endDate: format(rental.endDate, 'yyyy-MM-dd'),
    endTime: format(rental.endDate, 'HH:mm'),
    type: rental.type,
    reason: rental.reason,
    status: rental.status,
    numberOfWeeks: rental.numberOfWeeks || 1,
    amountToPay: '0',
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    negotiatedRate: rental.negotiatedRate?.toString() || '',
    negotiationNotes: rental.negotiationNotes || '',
    discountPercentage: rental.discountPercentage || 0,
    discountNotes: rental.discountNotes || '',
    signature: rental.signature || ''
  });

  const selectedVehicle = vehicles.find(v => v.id === rental.vehicleId);
  const selectedCustomer = customers.find(c => c.id === rental.customerId);

  // Calculate costs
  const calculateTotalCost = () => {
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
    const negotiatedRate = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;
    
    return calculateRentalCost(
      startDateTime,
      endDateTime,
      formData.type,
      selectedVehicle,
      formData.reason,
      negotiatedRate
    );
  };

  const totalCost = calculateTotalCost();
  const amountToPay = parseFloat(formData.amountToPay) || 0;
  const discountAmount = (totalCost * formData.discountPercentage) / 100;
  const newPaidAmount = rental.paidAmount + amountToPay;
  const remainingAmount = totalCost - newPaidAmount - discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

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

      const negotiatedRate = formData.negotiatedRate ? parseFloat(formData.negotiatedRate) : undefined;
      const finalCost = negotiatedRate ? 
        calculateRentalCost(startDateTime, endDateTime, formData.type, selectedVehicle, formData.reason, negotiatedRate) :
        standardCost;

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

      // Update rental data
      const rentalData = {
        startDate: startDateTime,
        endDate: endDateTime,
        type: formData.type,
        reason: formData.reason,
        status: formData.status,
        cost: finalCost,
        standardCost,
        paidAmount: newPaidAmount,
        remainingAmount,
        paymentStatus: newPaidAmount >= finalCost ? 'paid' : 
                      newPaidAmount > 0 ? 'partially_paid' : 'pending',
        payments,
        signature: formData.signature,
        // Only include negotiation fields if there's a negotiated rate
        ...(formData.negotiatedRate ? {
          negotiatedRate: parseFloat(formData.negotiatedRate),
          negotiationNotes: formData.negotiationNotes
        } : {
          negotiatedRate: null,
          negotiationNotes: null
        }),
        // Only include discount fields if there's a discount
        ...(formData.discountPercentage > 0 ? {
          discountPercentage: formData.discountPercentage,
          discountAmount: discountAmount,
          discountNotes: formData.discountNotes
        } : {
          discountPercentage: null,
          discountAmount: null,
          discountNotes: null
        }),
        updatedAt: new Date(),
        updatedBy: user.id
      };

      // Update rental record
      await updateDoc(doc(db, 'rentals', rental.id), rentalData);

      // Generate and upload new documents
      const documents = await generateRentalDocuments(
        { id: rental.id, ...rentalData },
        selectedVehicle,
        selectedCustomer
      );
      await uploadRentalDocuments(rental.id, documents);

      // Create finance transaction for new payment
      if (amountToPay > 0) {
        await createFinanceTransaction({
          type: 'income',
          category: 'rental',
          amount: amountToPay,
          description: `Rental payment for ${selectedVehicle.make} ${selectedVehicle.model} (${selectedVehicle.registrationNumber})`,
          referenceId: rental.id,
          vehicleId: selectedVehicle.id,
          vehicleName: `${selectedVehicle.make} ${selectedVehicle.model}`,
          vehicleOwner: selectedVehicle.owner,
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          paymentStatus: newPaidAmount >= finalCost ? 'paid' : 'partially_paid',
          date: new Date()
        });
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

         {formData.type === 'daily' && (
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

        {formData.type === 'claim' && (
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

        {formData.type === 'weekly' && (
  <>
    <FormField
      type="number"
      label="Number of Weeks"
      value={formData.numberOfWeeks}
      onChange={(e) => {
        const weeks = parseInt(e.target.value);
        setFormData(prev => {
          const startDateTime = new Date(`${prev.startDate}T${prev.startTime}`);
          const endDateTime = addWeeks(startDateTime, weeks);
          return {
            ...prev,
            numberOfWeeks: weeks,
            endDate: endDateTime.toISOString().split('T')[0],
            endTime: prev.startTime
          };
        });
      }}
      min="1"
      required
    />
    <div className="col-span-2 grid grid-cols-2 gap-4">
      <FormField
        type="date"
        label="End Date (Optional Override)"
        value={formData.endDate}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          endDate: e.target.value,
          // Recalculate number of weeks based on new end date
          numberOfWeeks: Math.ceil(
            differenceInDays(
              new Date(`${e.target.value}T${prev.endTime}`),
              new Date(`${prev.startDate}T${prev.startTime}`)
            ) / 7
          )
        }))}
        min={formData.startDate}
      />
      <FormField
        type="time"
        label="End Time"
        value={formData.endTime}
        onChange={(e) => setFormData(prev => ({
          ...prev,
          endTime: e.target.value
        }))}
      />
    </div>
  </>
)}

      </div>

      {/* Negotiation Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Rate Negotiation</h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Negotiated Rate (Optional)"
            value={formData.negotiatedRate}
            onChange={(e) => setFormData({ ...formData, negotiatedRate: e.target.value })}
            min="0"
            step="0.01"
            placeholder={`Enter custom ${formData.type === 'weekly' ? 'weekly' : 'daily'} rate`}
          />

          {formData.negotiatedRate && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Negotiation Notes</label>
              <textarea
                value={formData.negotiationNotes}
                onChange={(e) => setFormData({ ...formData, negotiationNotes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Add notes about rate negotiation..."
                
              />
            </div>
          )}
        </div>
      </div>

      {/* Discount Section */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Discount</h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Discount Percentage"
            value={formData.discountPercentage}
            onChange={(e) => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) })}
            min="0"
            max="100"
            step="0.1"
          />

          {formData.discountPercentage > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Discount Notes</label>
              <textarea
                value={formData.discountNotes}
                onChange={(e) => setFormData({ ...formData, discountNotes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                placeholder="Add notes about the discount..."
                
              />
            </div>
          )}
        </div>
      </div>

      {/* Cost Summary */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Base Cost:</span>
            <span className="font-medium">£{totalCost.toFixed(2)}</span>
          </div>

          {formData.negotiatedRate && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>Negotiated Rate:</span>
              <span>£{formData.negotiatedRate}/{formData.type === 'weekly' ? 'week' : 'day'}</span>
            </div>
          )}

          {formData.discountPercentage > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount ({formData.discountPercentage}%):</span>
              <span>-£{discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Final Amount:</span>
            <span className="font-medium">£{(totalCost - discountAmount).toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm text-green-600">
            <span>Previously Paid:</span>
            <span>£{rental.paidAmount.toFixed(2)}</span>
          </div>

          {amountToPay > 0 && (
            <div className="flex justify-between text-sm text-blue-600">
              <span>New Payment:</span>
              <span>£{amountToPay.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm text-amber-600">
            <span>Remaining Amount:</span>
            <span>£{remainingAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm font-medium pt-2 border-t">
            <span>Payment Status:</span>
            <span className="capitalize">
              {newPaidAmount >= totalCost ? 'Paid' : 
               newPaidAmount > 0 ? 'Partially Paid' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Details</h3>
        <div className="space-y-4">
          <FormField
            type="number"
            label="Amount to Pay"
            value={formData.amountToPay}
            onChange={(e) => setFormData({ ...formData, amountToPay: e.target.value })}
            min="0"
            max={totalCost - discountAmount - rental.paidAmount}
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