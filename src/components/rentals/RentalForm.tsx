import React, { useState, useEffect } from 'react';
import { Vehicle, Customer } from '../../types';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import FormField from '../ui/FormField';
import VehicleSelect from '../VehicleSelect';
import { calculateRentalCost, RENTAL_TYPES, RENTAL_RATES } from '../../utils/rentalCalculations';
import { addDays, addWeeks } from 'date-fns';

interface RentalFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalForm: React.FC<RentalFormProps> = ({ vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customRate, setCustomRate] = useState<string>('');
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [numberOfWeeks, setNumberOfWeeks] = useState<number>(1);
  const [formData, setFormData] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: addWeeks(new Date(), 1).toISOString().split('T')[0],
    type: RENTAL_TYPES.DAILY as keyof typeof RENTAL_TYPES,
    reason: 'hired' as 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop' | 'wfw-c-substitute' | 'h-substitute',
    status: 'awaiting' as 'urgent' | 'awaiting' | 'levc-loan' | 'completed'
  });

  // Update end date when rental type or number of weeks changes
  useEffect(() => {
    const startDate = new Date(formData.startDate);
    let endDate = startDate;

    if (formData.type === RENTAL_TYPES.WEEKLY) {
      endDate = addWeeks(startDate, numberOfWeeks);
      endDate = addDays(endDate, -1);
    }

    setFormData(prev => ({
      ...prev,
      endDate: endDate.toISOString().split('T')[0]
    }));
  }, [formData.type, formData.startDate, numberOfWeeks]);

  const standardCost = calculateRentalCost(
    new Date(formData.startDate),
    new Date(formData.endDate),
    formData.type,
    formData.reason
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !selectedCustomerId) {
      toast.error('Please select a vehicle and customer');
      return;
    }
    setLoading(true);

    try {
      const finalCost = customRate ? parseFloat(customRate) : standardCost;

      await addDoc(collection(db, 'rentals'), {
        vehicleId: selectedVehicleId,
        customerId: selectedCustomerId,
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        type: formData.type,
        reason: formData.reason,
        status: formData.status,
        numberOfWeeks: formData.type === RENTAL_TYPES.WEEKLY ? numberOfWeeks : undefined,
        cost: finalCost,
        standardCost,
        negotiated: !!customRate,
        negotiationNotes: negotiationNotes || null,
        approvedBy: customRate ? user?.id : null,
        paymentStatus: 'pending',
        createdAt: new Date(),
        createdBy: user?.id,
        updatedAt: new Date(),
      });

      toast.success('Rental scheduled successfully');
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
        vehicles={vehicles.filter(v => v.status === 'active')}
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
          onChange={(e) => setFormData({ ...formData, type: e.target.value as keyof typeof RENTAL_TYPES })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          required
        >
          <option value={RENTAL_TYPES.DAILY}>Daily (£{RENTAL_RATES.daily}/day)</option>
          <option value={RENTAL_TYPES.WEEKLY}>Weekly (£{RENTAL_RATES.weekly}/week)</option>
          <option value={RENTAL_TYPES.CLAIM}>Claim (£{RENTAL_RATES.claim}/day)</option>
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
          <option value="wfw-c-substitute">WFW C Substitute</option>
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
          <option value="urgent">Urgent</option>
          <option value="awaiting">Awaiting</option>
          <option value="levc-loan">LEVC Loan</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {formData.type === RENTAL_TYPES.WEEKLY && (
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
          min={new Date().toISOString().split('T')[0]}
        />

        <FormField
          type="date"
          label="End Date"
          value={formData.endDate}
          readOnly={formData.type === RENTAL_TYPES.WEEKLY}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          required
          min={formData.startDate}
          className={formData.type === RENTAL_TYPES.WEEKLY ? 'bg-gray-100' : ''}
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-700">Standard Cost:</span>
          <span className="text-lg font-semibold">£{standardCost.toFixed(2)}</span>
        </div>

        {(user?.role === 'admin' || user?.role === 'manager') && (
          <>
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

            {customRate && (
              <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Custom rate will be approved by {user.name} ({user.role})
                </p>
              </div>
            )}
          </>
        )}
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
          {loading ? 'Scheduling...' : 'Schedule Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalForm;