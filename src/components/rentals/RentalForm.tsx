import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, Customer, Rental } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { addDays, addWeeks, format } from 'date-fns';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { checkRentalConflict } from '../../utils/rentalValidation';
import { useRentals } from '../../hooks/useRentals';
import { formatDateTime } from '../../utils/rentalDateUtils';
import FormField from '../ui/FormField';
import VehicleSelect from '../VehicleSelect';
import toast from 'react-hot-toast';

interface RentalFormProps {
  rental?: Rental;
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalForm: React.FC<RentalFormProps> = ({ rental, vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const { rentals } = useRentals();
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(rental?.vehicleId || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(rental?.customerId || '');
  const [customRate, setCustomRate] = useState<string>(rental?.negotiated ? rental.cost.toString() : '');
  const [negotiationNotes, setNegotiationNotes] = useState(rental?.negotiationNotes || '');
  const [numberOfWeeks, setNumberOfWeeks] = useState<number>(rental?.numberOfWeeks || 1);
  const [paidAmount, setPaidAmount] = useState(rental?.paidAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'cheque'>(
    rental?.paymentMethod || 'cash'
  );
  const [paymentReference, setPaymentReference] = useState(rental?.paymentReference || '');

  const [formData, setFormData] = useState({
    startDate: rental?.startDate ? format(rental.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: rental?.startDate ? format(rental.startDate, 'HH:mm') : format(new Date(), 'HH:mm'),
    endDate: rental?.endDate ? format(rental.endDate, 'yyyy-MM-dd') : format(addWeeks(new Date(), 1), 'yyyy-MM-dd'),
    endTime: rental?.endDate ? format(rental.endDate, 'HH:mm') : format(new Date(), 'HH:mm'),
    type: rental?.type || 'daily',
    reason: rental?.reason || 'hired',
    status: rental?.status || 'scheduled',
  });

  // Update end date when rental type or number of weeks changes
  useEffect(() => {
    if (formData.type === 'weekly') {
      const startDate = new Date(formData.startDate);
      const endDate = addDays(addWeeks(startDate, numberOfWeeks), -1);
      setFormData(prev => ({
        ...prev,
        endDate: format(endDate, 'yyyy-MM-dd'),
        endTime: formData.startTime
      }));
    }
  }, [formData.type, formData.startDate, formData.startTime, numberOfWeeks]);

  // Calculate costs
  const startDateTime = formatDateTime(formData.startDate, formData.startTime);
  const endDateTime = formatDateTime(formData.endDate, formData.endTime);
  const standardCost = calculateRentalCost(startDateTime, endDateTime, formData.type, formData.reason);
  const finalCost = customRate ? parseFloat(customRate) : standardCost;
  const remainingAmount = finalCost - paidAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !selectedCustomerId || !user) {
      toast.error('Please select a vehicle and customer');
      return;
    }

    // Check for rental conflicts
    const hasConflict = checkRentalConflict(
      rentals,
      selectedVehicleId,
      startDateTime,
      endDateTime,
      rental?.id
    );

    if (hasConflict) {
      toast.error('This vehicle is already booked for the selected dates');
      return;
    }

    setLoading(true);

    try {
      const rentalData = {
        vehicleId: selectedVehicleId,
        customerId: selectedCustomerId,
        startDate: startDateTime,
        endDate: endDateTime,
        type: formData.type,
        reason: formData.reason,
        status: formData.status,
        cost: finalCost,
        standardCost,
        negotiated: !!customRate,
        negotiationNotes: negotiationNotes || null,
        approvedBy: customRate ? user.id : null,
        paidAmount,
        remainingAmount,
        paymentMethod,
        paymentReference,
        paymentStatus: paidAmount >= finalCost ? 'paid' : 
                      paidAmount > 0 ? 'partially_paid' : 'pending',
        ...(formData.type === 'weekly' ? { numberOfWeeks } : {}),
        updatedAt: new Date(),
        updatedBy: user.id
      };

      if (rental) {
        await updateDoc(doc(db, 'rentals', rental.id), rentalData);
        toast.success('Rental updated successfully');
      } else {
        await addDoc(collection(db, 'rentals'), {
          ...rentalData,
          createdAt: new Date(),
          createdBy: user.id,
        });
        toast.success('Rental scheduled successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error scheduling rental:', error);
      toast.error('Failed to schedule rental');
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
        <label className="block text-sm font-medium text-gray-700">Customer</label>
        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="">Select a customer</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} - {customer.mobile}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Rental Type</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
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

      {formData.type === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Number of Weeks</label>
          <input
            type="number"
            min="1"
            value={numberOfWeeks}
            onChange={(e) => setNumberOfWeeks(parseInt(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            required
          />
        </div>
      )}

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
          disabled={formData.type === 'weekly'}
          className={formData.type === 'weekly' ? 'bg-gray-100' : ''}
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
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value="scheduled">Scheduled</option>
          <option value="rented">Rented</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {(user?.role === 'admin' || user?.role === 'manager') && (
        <div className="space-y-4">
          <FormField
            type="number"
            label="Negotiated Rate (Optional)"
            value={customRate}
            onChange={(e) => setCustomRate(e.target.value)}
            min="0"
            step="0.01"
            placeholder="Enter custom rate"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Negotiation Notes</label>
            <textarea
              value={negotiationNotes}
              onChange={(e) => setNegotiationNotes(e.target.value)}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              placeholder="Enter reason for rate negotiation..."
              required={!!customRate}
            />
          </div>
        </div>
      )}

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
            max={finalCost}
            step="0.01"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
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

        {/* Payment Summary */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Amount:</span>
            <span className="font-medium">£{finalCost.toFixed(2)}</span>
          </div>
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
            <span className="font-medium capitalize">
              {paidAmount >= finalCost ? 'Paid' : 
               paidAmount > 0 ? 'Partially Paid' : 'Pending'}
            </span>
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
          {loading ? 'Saving...' : rental ? 'Update Rental' : 'Schedule Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalForm;