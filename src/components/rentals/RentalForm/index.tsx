import React from 'react';
import { Vehicle, Customer } from '../../../types';
import VehicleSelect from './VehicleSelect';
import CustomerSelect from './CustomerSelect';
import RentalDetails from './RentalDetails';
import PaymentDetails from './PaymentDetails';
import SignatureCapture from './SignatureCapture';
import { useRentalForm } from './useRentalForm';
import { calculateRentalCost } from '../../../utils/rentalCalculations';

interface RentalFormProps {
  vehicles: Vehicle[];
  customers: Customer[];
  onClose: () => void;
}

const RentalForm: React.FC<RentalFormProps> = ({ vehicles, customers, onClose }) => {
  const {
    formData,
    loading,
    handleSubmit,
    handleInputChange,
    handleSignatureCapture,
    errors
  } = useRentalForm(onClose);

  // Calculate costs
  const totalCost = formData.startDate && formData.endDate ? 
    calculateRentalCost(
      new Date(`${formData.startDate}T${formData.startTime}`),
      new Date(`${formData.endDate}T${formData.endTime}`),
      formData.type,
      formData.reason
    ) : 0;

  const remainingAmount = Math.max(0, totalCost - formData.paidAmount);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Vehicle Selection */}
      <VehicleSelect
        vehicles={vehicles.filter(v => v.status === 'available')}
        selectedVehicleId={formData.vehicleId}
        onSelect={(id) => handleInputChange({ 
          target: { name: 'vehicleId', value: id }
        } as any)}
        error={errors.vehicleId}
      />

      {/* Customer Selection */}
      <CustomerSelect
        customers={customers}
        selectedCustomerId={formData.customerId}
        onSelect={(id) => handleInputChange({ 
          target: { name: 'customerId', value: id }
        } as any)}
        error={errors.customerId}
      />

      {/* Rental Details */}
      <RentalDetails
        formData={formData}
        onChange={handleInputChange}
        disabled={loading}
        errors={errors}
      />

      {/* Payment Details */}
      <PaymentDetails
        formData={formData}
        totalCost={totalCost}
        remainingAmount={remainingAmount}
        onChange={handleInputChange}
        disabled={loading}
        errors={errors}
      />

      {/* Signature Capture */}
      <SignatureCapture
        onCapture={handleSignatureCapture}
        disabled={loading}
        error={errors.signature}
      />

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
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalForm;