import React, { useState, useEffect } from 'react';
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost, calculateWeeklyEndDate } from '../../utils/rentalCalculations';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import FormField from '../ui/FormField';
import SearchableSelect from './SearchableSelect';
import SignaturePad from '../ui/SignaturePad';
import TextArea from '../ui/TextArea';
import toast from 'react-hot-toast';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
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
    numberOfWeeks: 1,
    signature: '',
    paidAmount: 0,
    paymentMethod: 'cash' as const,
    paymentReference: '',
    customRate: '',
    negotiationNotes: '',
    status: 'scheduled' as const
  });

  // Update end date when rental type or number of weeks changes
  useEffect(() => {
    if (formData.type === 'weekly') {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDate = calculateWeeklyEndDate(startDateTime, formData.numberOfWeeks);
      setFormData(prev => ({
        ...prev,
        endDate: endDate.toISOString().split('T')[0],
        endTime: formData.startTime
      }));
    }
  }, [formData.type, formData.numberOfWeeks, formData.startDate, formData.startTime]);

  // Calculate total cost
  const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
  const endDateTime = formData.endDate ? 
    new Date(`${formData.endDate}T${formData.endTime}`) : 
    startDateTime;
  
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

    // Validate signature
    if (!formData.signature) {
      toast.error('Customer signature is required');
      return;
    }

    // Validate number of weeks for weekly rentals
    if (formData.type === 'weekly' && (!formData.numberOfWeeks || formData.numberOfWeeks < 1)) {
      toast.error('Please enter a valid number of weeks');
      return;
    }

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
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      const selectedCustomer = customers.find(c => c.id === formData.customerId);

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
        status: formData.status,
        negotiated: !!formData.customRate,
        createdAt: new Date(),
        createdBy: user.id,
        documents: {},
        extensionHistory: []
      };

      // Create rental record
      const rentalRef = await addDoc(collection(db, 'rentals'), rentalData);
      const rental = { id: rentalRef.id, ...rentalData };

      // Create financial transaction if payment was made
      if (formData.paidAmount > 0) {
        await createFinanceTransaction({
          type: 'income',
          category: 'rental',
          amount: formData.paidAmount,
          description: `Rental payment for ${selectedVehicle.make} ${selectedVehicle.model}`,
          referenceId: rental.id,
          vehicleId: selectedVehicle.id,
          vehicleName: `${selectedVehicle.make} ${selectedVehicle.model}`,
          vehicleOwner: selectedVehicle.owner || { name: 'AIE Skyline', isDefault: true },
          paymentMethod: formData.paymentMethod,
          paymentReference: formData.paymentReference,
          status: 'completed'
        });
      }

      // Generate and upload documents
      const documents = await generateRentalDocuments(rental, selectedVehicle, selectedCustomer);
      await uploadRentalDocuments(rental.id, documents);

      toast.success('Rental created successfully');
      onClose();
    } catch (error) {
      console.error('Error creating rental:', error);
      toast.error('Failed to create rental');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle and Customer Selection */}
      <SearchableSelect
        label="Vehicle"
        options={vehicles
          .filter(v => v.status !== 'rented')
          .map(v => ({
            id: v.id,
            label: `${v.make} ${v.model}`,
            subLabel: v.registrationNumber
          }))}
        value={formData.vehicleId}
        onChange={(id) => setFormData({ ...formData, vehicleId: id })}
        placeholder="Search by make, model or registration..."
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
        placeholder="Search by name, mobile or email..."
        required
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
            onChange={(e) => setFormData({ 
              ...formData, 
              numberOfWeeks: Math.max(1, parseInt(e.target.value) || 1)
            })}
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
            <span className="font-medium capitalize">
              {formData.paidAmount >= totalCost ? 'Paid' : 
               formData.paidAmount > 0 ? 'Partially Paid' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Signature */}
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
          {loading ? 'Creating...' : 'Create Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalForm;