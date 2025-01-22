import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Vehicle, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { calculateRentalCost } from '../../utils/rentalCalculations';
import { generateRentalDocuments } from '../../utils/generateRentalDocuments';
import { uploadRentalDocuments } from '../../utils/documentUpload';
import FormField from '../ui/FormField';
import SignaturePad from '../ui/SignaturePad';
import { addWeeks, isMonday, nextMonday, format } from 'date-fns';
import toast from 'react-hot-toast';
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
    customRate: '',
    negotiationNotes: ''
  });

  // Get available vehicles based on selected dates
  const { availableVehicles, loading: loadingVehicles } = useAvailableVehicles(
    vehicles,
    formData.startDate ? new Date(`${formData.startDate}T${formData.startTime}`) : undefined,
    formData.endDate ? new Date(`${formData.endDate}T${formData.endTime}`) : undefined
  );

  // Update end date when type or number of weeks changes
  useEffect(() => {
    if (formData.type === 'weekly' && formData.startDate) {
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
  }, [formData.type, formData.numberOfWeeks, formData.startDate, formData.startTime]);

  // Filter vehicles based on search and availability
  const filteredVehicles = availableVehicles.filter(vehicle => {
    const searchLower = vehicleSearchQuery.toLowerCase();
    return (
      vehicle.make.toLowerCase().includes(searchLower) ||
      vehicle.model.toLowerCase().includes(searchLower) ||
      vehicle.registrationNumber.toLowerCase().includes(searchLower)
    );
  });

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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // ... rest of the submit logic remains the same
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
            disabled={!formData.startDate}
          />
        </div>

        {/* Vehicle Search Results */}
        {showVehicleResults && formData.startDate && (
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

      {/* Rest of the form components */}
      {/* ... Customer search, rental details, payment details, etc. */}
      
      {/* Rental Type and Dates */}
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
          <>
            <FormField
              type="number"
              label="Number of Weeks"
              value={formData.numberOfWeeks}
              onChange={(e) => setFormData({ ...formData, numberOfWeeks: parseInt(e.target.value) })}
              min="1"
              required
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