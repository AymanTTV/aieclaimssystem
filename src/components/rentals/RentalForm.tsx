import React, { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import SearchableSelect from '../ui/SearchableSelect';
import SignaturePad from '../ui/SignaturePad';
import { addWeeks } from 'date-fns';
import toast from 'react-hot-toast';
import { createFinanceTransaction } from '../../utils/financeTransactions';

interface RentalFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalForm: React.FC<RentalFormProps> = ({ vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    customerId: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: new Date().toTimeString().slice(0, 5),
    endDate: '',
    endTime: '',
    type: 'daily' as const,
    reason: 'hired' as const,
    status: 'scheduled' as const,
    numberOfWeeks: 1,
    signature: '',
    paidAmount: 0,
    paymentMethod: 'cash' as const,
    paymentReference: '',
    paymentNotes: '',
    customRate: '',
    negotiationNotes: ''
  });

  // Ensure valid date helper function
  const ensureValidDate = (dateStr: string, timeStr?: string): Date => {
    if (!dateStr) {
      throw new Error('Date is required');
    }
    const time = timeStr || '00:00'; // Default to midnight if time is not provided
    const date = new Date(`${dateStr}T${time}`);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date/time');
    }
    return new Date(Math.floor(date.getTime() / 1000) * 1000); // Firestore-safe
  };
  

  // Calculate costs based on rental type
  const calculateCosts = () => {
    if (!formData.startDate || !formData.startTime) return { standardCost: 0, totalCost: 0, remainingAmount: 0 };

    const startDateTime = ensureValidDate(formData.startDate, formData.startTime);
    const endDateTime = formData.type === 'weekly'
      ? addWeeks(startDateTime, formData.numberOfWeeks)
      : formData.endDate
      ? ensureValidDate(formData.endDate, formData.endTime)
      : startDateTime;

    const standardCost = calculateRentalCost(
      startDateTime,
      endDateTime,
      formData.type,
      formData.reason,
      formData.numberOfWeeks
    );
    const totalCost = formData.customRate ? parseFloat(formData.customRate) : standardCost;
    const remainingAmount = totalCost - formData.paidAmount;

    return { standardCost, totalCost, remainingAmount };
  };

  const { standardCost, totalCost, remainingAmount } = calculateCosts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let startDateTime, endDateTime;

      try {
        startDateTime = ensureValidDate(formData.startDate, formData.startTime);
        endDateTime = formData.type === 'weekly'
          ? addWeeks(startDateTime, formData.numberOfWeeks)
          : ensureValidDate(formData.endDate, formData.endTime);
      } catch (error) {
        toast.error('Please enter valid dates and times');
        return;
      }

      // Ensure costs are recalculated
      const { standardCost, totalCost, remainingAmount } = calculateCosts();
      const paymentStatus =
        formData.paidAmount >= totalCost
          ? 'paid'
          : formData.paidAmount > 0
          ? 'partially_paid'
          : 'pending';

      const payments = [];
      if (formData.paidAmount > 0) {
        payments.push({
          id: Date.now().toString(),
          date: new Date(),
          amount: formData.paidAmount,
          method: formData.paymentMethod,
          reference: formData.paymentReference,
          notes: formData.paymentNotes,
          createdAt: new Date(),
          createdBy: user.id
        });
      }

      const rentalData = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
        cost: totalCost,
        standardCost,
        paidAmount: formData.paidAmount,
        remainingAmount,
        paymentStatus,
        negotiated: !!formData.customRate,
        payments,
        createdAt: new Date(),
        createdBy: user.id,
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'rentals'), rentalData);

      const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
      const selectedCustomer = customers.find((c) => c.id === formData.customerId);

      if (selectedVehicle && selectedCustomer) {
        const documents = await generateRentalDocuments(
          { id: docRef.id, ...rentalData },
          selectedVehicle,
          selectedCustomer
        );
        await uploadRentalDocuments(docRef.id, documents);
      }

      if (formData.paidAmount > 0) {
        await createFinanceTransaction({
          type: 'income',
          category: 'rental',
          amount: formData.paidAmount,
          description: `Rental payment for ${selectedVehicle?.make} ${selectedVehicle?.model}`,
          referenceId: docRef.id,
          vehicleId: selectedVehicle?.id,
          vehicleName: `${selectedVehicle?.make} ${selectedVehicle?.model}`,
          vehicleOwner: selectedVehicle?.owner || { name: 'AIE Skyline', isDefault: true },
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          status: 'completed'
        });
      }

      toast.success('Rental created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating rental:', error);
      toast.error('Failed to create rental');
    } finally {
      setLoading(false);
    }
  };

  const canNegotiate = user?.role === 'admin' || user?.role === 'manager';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <SearchableSelect
        label="Vehicle"
        options={vehicles.map(v => ({
          id: v.id,
          label: `${v.make} ${v.model}`,
          subLabel: v.registrationNumber
        }))}
        value={formData.vehicleId}
        onChange={(id) => setFormData({ ...formData, vehicleId: id })}
        placeholder="Search vehicles..."
        required
      />

      <SearchableSelect
        label="Customer"
        options={customers.map(c => ({
          id: c.id,
          label: c.name,
          subLabel: `${c.mobile} - ${c.email}`
        }))}
        value={formData.customerId}
        onChange={(id) => {
          const customer = customers.find(c => c.id === id);
          setFormData({ 
            ...formData, 
            customerId: id,
            signature: customer?.signature || ''
          });
        }}
        placeholder="Search customers..."
        required
      />

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
            onChange={(e) => handleWeeklyRental(parseInt(e.target.value))}
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
  )}
</div>

{/* Payment Details */}
<div className="space-y-4 border-t pt-4">
  <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
  
  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
    <div className="flex justify-between text-sm">
      <span>Total Cost:</span>
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
  </div>

  <FormField
    type="number"
    label="Amount to Pay"
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
          {loading ? 'Creating...' : 'Create Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalForm;