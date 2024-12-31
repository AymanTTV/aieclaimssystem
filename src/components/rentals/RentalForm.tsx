import React, { useState } from 'react';
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore'; // Added updateDoc import
import { db } from '../../lib/firebase';
import { generateRentalAgreement, generateRentalInvoice } from '../../utils/pdfGeneration';
import { uploadPDF } from '../../utils/pdfStorage';
import FormField from '../ui/FormField';
import VehicleSelect from '../VehicleSelect';
import SignaturePad from '../ui/SignaturePad';
import toast from 'react-hot-toast';

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
    negotiationNotes: ''
  });

  // Calculate total cost
  const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
  const endDateTime = formData.endDate ? new Date(`${formData.endDate}T${formData.endTime}`) : null;
  
  const totalCost = (startDateTime && endDateTime) ? 
    calculateRentalCost(startDateTime, endDateTime, formData.type, formData.reason) : 0;

  const remainingAmount = Math.max(0, totalCost - formData.paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Create rental record
      const rentalData = {
        ...formData,
        startDate: startDateTime,
        endDate: endDateTime,
        cost: totalCost,
        remainingAmount,
        paymentStatus: formData.paidAmount >= totalCost ? 'paid' : 'pending',
        status: 'scheduled',
        createdAt: new Date(),
        createdBy: user.id
      };

      const rentalRef = await addDoc(collection(db, 'rentals'), rentalData);
      const rental = { id: rentalRef.id, ...rentalData };

      // Get vehicle and customer details
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      const selectedCustomer = customers.find(c => c.id === formData.customerId);

      if (!selectedVehicle || !selectedCustomer) {
        throw new Error('Vehicle or customer not found');
      }

      // Generate PDFs
      const [agreementPDF, invoicePDF] = await Promise.all([
        generateRentalAgreement(rental, selectedVehicle, selectedCustomer),
        generateRentalInvoice(rental, selectedVehicle, selectedCustomer)
      ]);

      // Upload PDFs
      const [agreementURL, invoiceURL] = await Promise.all([
        uploadPDF(agreementPDF, `rentals/${rental.id}/agreement.pdf`),
        uploadPDF(invoicePDF, `rentals/${rental.id}/invoice.pdf`)
      ]);

      // Update rental with document URLs
      await updateDoc(doc(db, 'rentals', rental.id), {
        documents: {
          agreement: agreementURL,
          invoice: invoiceURL
        }
      });

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
      {/* Vehicle Selection */}
      <VehicleSelect
        vehicles={vehicles.filter(v => v.status === 'available')}
        selectedVehicleId={formData.vehicleId}
        onSelect={(id) => setFormData({ ...formData, vehicleId: id })}
      />

      {/* Customer Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Customer</label>
        <select
          value={formData.customerId}
          onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
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

      {/* Signature */}
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
          {loading ? 'Creating...' : 'Create Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalForm;
