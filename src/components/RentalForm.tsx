// src/components/rentals/RentalForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import SignaturePad from '../ui/SignaturePad';
import { addWeeks, nextMonday, isMonday, format } from 'date-fns';
import toast from 'react-hot-toast';
import { createFinanceTransaction } from '../../utils/financeTransactions';
import { Search, Car } from 'lucide-react';
import { useAvailableVehicles } from '../../hooks/useAvailableVehicles';

interface RentalFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalForm: React.FC<RentalFormProps> = ({ vehicles, customers, onClose }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showVehicleResults, setShowVehicleResults] = useState(false);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

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
  negotiatedRate: '',
  negotiationNotes: '',
  discountPercentage: 0,
  discountNotes: ''
  });

  // Get available vehicles
  const { availableVehicles, loading: loadingVehicles } = useAvailableVehicles(
    vehicles,
    formData.startDate ? new Date(`${formData.startDate}T${formData.startTime}`) : undefined,
    formData.endDate ? new Date(`${formData.endDate}T${formData.endTime}`) : undefined
  );

  // Filter vehicles based on search
  const filteredVehicles = useMemo(() => {
    return availableVehicles.filter(vehicle => {
      const searchLower = vehicleSearchQuery.toLowerCase();
      return (
        vehicle.make.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        vehicle.registrationNumber.toLowerCase().includes(searchLower)
      );
    });
  }, [availableVehicles, vehicleSearchQuery]);

  // Filter customers based on search
 // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const searchLower = customerSearchQuery.toLowerCase();
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.mobile.includes(searchLower) ||
        customer.email.toLowerCase().includes(searchLower)
      );
    });
  }, [customers, customerSearchQuery]);

  // Selected vehicle and customer details
  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  // Calculate rental cost
  const calculateTotalCost = () => {
    if (!selectedVehicle || !formData.startDate || !formData.endDate) return 0;

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
  const remainingAmount = totalCost - formData.paidAmount;

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



  // Add this handler function
const handleRentalTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const newType = e.target.value as typeof formData.type;
  setFormData(prev => ({ 
    ...prev, 
    type: newType,
    // Reset end date/time if switching from weekly to daily
    ...(newType === 'daily' && {
      endDate: '',
      endTime: prev.startTime
    })
  }));
};


  // Handle weekly rental calculations
  const handleWeeklyRental = (weeks: number) => {
  const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
  let endDateTime;
  
  if (!isMonday(startDateTime)) {
    const firstMonday = nextMonday(startDateTime);
    endDateTime = addWeeks(firstMonday, weeks - 1);
  } else {
    endDateTime = addWeeks(startDateTime, weeks);
  }

  setFormData(prev => ({
    ...prev,
    numberOfWeeks: weeks,
    endDate: endDateTime.toISOString().split('T')[0],
    endTime: formData.startTime
  }));
};

  // Rest of the component implementation remains the same...
  // (handleSubmit and return JSX)

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
      if (!selectedVehicle) {
        throw new Error('Selected vehicle not found');
      }

      // Calculate costs
      const standardCost = calculateRentalCost(
        startDateTime,
        endDateTime,
        formData.type,
        selectedVehicle,
        formData.reason
      );

      const finalCost = formData.customRate ? parseFloat(formData.customRate) : standardCost;
      const remainingAmount = finalCost - formData.paidAmount;

      // Create initial payment record if amount paid
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

      // Create rental record
      const rentalData = {
  vehicleId: formData.vehicleId,
  customerId: formData.customerId,
  startDate: startDateTime,
  endDate: endDateTime,
  type: formData.type,
  reason: formData.reason,
  status: formData.status,
  cost: finalCost,
  standardCost,
  paidAmount: formData.paidAmount,
  remainingAmount,
  paymentStatus: formData.paidAmount >= finalCost ? 'paid' : 
                formData.paidAmount > 0 ? 'partially_paid' : 'pending',
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
  createdAt: new Date(),
  createdBy: user.id,
  updatedAt: new Date()
};

      const docRef = await addDoc(collection(db, 'rentals'), rentalData);

      // Generate and upload documents
      const selectedCustomer = customers.find(c => c.id === formData.customerId);
      if (selectedVehicle && selectedCustomer) {
        const documents = await generateRentalDocuments(
          { id: docRef.id, ...rentalData },
          selectedVehicle,
          selectedCustomer
        );
        await uploadRentalDocuments(docRef.id, documents);
      }

      // Create finance transaction if payment made
      if (formData.paidAmount > 0) {
        await createFinanceTransaction({
          type: 'income',
          category: 'rental',
          amount: formData.paidAmount,
          description: `Rental payment for ${selectedVehicle.make} ${selectedVehicle.model}`,
          referenceId: docRef.id,
          vehicleId: selectedVehicle.id,
          vehicleName: `${selectedVehicle.make} ${selectedVehicle.model}`,
          vehicleOwner: selectedVehicle.owner || { name: 'AIE Skyline', isDefault: true },
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Search */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Vehicle</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={vehicleSearchQuery}
            onChange={(e) => {
              setVehicleSearchQuery(e.target.value);
              setShowVehicleResults(true);
            }}
            onFocus={() => setShowVehicleResults(true)}
            placeholder="Search vehicles..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Vehicle Search Results */}
        {showVehicleResults && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
            {loadingVehicles ? (
              <div className="px-4 py-2 text-sm text-gray-500">Loading vehicles...</div>
            ) : filteredVehicles.length > 0 ? (
              filteredVehicles.map(vehicle => (
                <div
                  key={vehicle.id}
                  className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, vehicleId: vehicle.id }));
                    setVehicleSearchQuery(`${vehicle.make} ${vehicle.model} - ${vehicle.registrationNumber}`);
                    setShowVehicleResults(false);
                  }}
                >
                  <div className="flex items-center">
                    <Car className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <div className="font-medium">{vehicle.make} {vehicle.model}</div>
                      <div className="text-sm text-gray-500">
                        {vehicle.registrationNumber}
                        {vehicle.weeklyRentalPrice && ` - £${vehicle.weeklyRentalPrice}/week`}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">No available vehicles found</div>
            )}
          </div>
        )}

        {/* Selected Vehicle Details */}
        {selectedVehicle && (
          <div className="mt-2 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900">Selected Vehicle</h4>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Make/Model:</span>
                <span className="ml-2">{selectedVehicle.make} {selectedVehicle.model}</span>
              </div>
              <div>
                <span className="text-gray-500">Registration:</span>
                <span className="ml-2">{selectedVehicle.registrationNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Daily Rate:</span>
                <span className="ml-2">£{selectedVehicle.dailyRentalPrice || '60'}</span>
              </div>
              <div>
                <span className="text-gray-500">Weekly Rate:</span>
                <span className="ml-2">£{selectedVehicle.weeklyRentalPrice || '360'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Search */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Customer</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={customerSearchQuery}
            onChange={(e) => {
              setCustomerSearchQuery(e.target.value);
              setShowCustomerResults(true);
            }}
            onFocus={() => setShowCustomerResults(true)}
            placeholder="Search customers..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        {/* Customer Search Results */}
        {showCustomerResults && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
            {filteredCustomers.map(customer => (
              <div
                key={customer.id}
                className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                onClick={() => {
                  setFormData(prev => ({ 
                    ...prev, 
                    customerId: customer.id,
                    signature: customer.signature || ''
                  }));
                  setCustomerSearchQuery(customer.name);
                  setShowCustomerResults(false);
                }}
              >
                <div className="font-medium">{customer.name}</div>
                <div className="text-sm text-gray-500">
                  {customer.mobile} - {customer.email}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Selected Customer Details */}
        {selectedCustomer && (
          <div className="mt-2 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900">Selected Customer</h4>
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <span className="ml-2">{selectedCustomer.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Mobile:</span>
                <span className="ml-2">{selectedCustomer.mobile}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>
                <span className="ml-2">{selectedCustomer.email}</span>
              </div>
              <div>
                <span className="text-gray-500">License Expiry:</span>
                <span className="ml-2">{format(selectedCustomer.licenseExpiry, 'dd/MM/yyyy')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700">Rental Type</label>
            <select
              value={formData.type}
              onChange={handleRentalTypeChange}
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

      {/* Payment Details */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
        
        <FormField
          type="number"
          label="Amount to Pay"
          value={formData.paidAmount}
          onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
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

      {/* Rest of the form fields remain the same... */}
      {/* (Rental Type, Dates, Payment Details, etc.) */}

      {/* Cost Summary */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Summary</h3>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Cost:</span>
            <span className="font-medium">£{totalCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Amount Paid:</span>
            <span className="text-green-600">£{formData.paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Remaining Amount:</span>
            <span className="text-amber-600">£{remainingAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span>Payment Status:</span>
            <span className="font-medium capitalize">
              {formData.paidAmount >= totalCost ? 'Paid' : 
               formData.paidAmount > 0 ? 'Partially Paid' : 'Pending'}
            </span>
          </div>
        </div>
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
