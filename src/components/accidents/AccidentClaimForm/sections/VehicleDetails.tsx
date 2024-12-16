import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const VehicleDetails = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Registered Keeper Name"
          error={errors.registeredKeeperName?.message as string}
          {...register('registeredKeeperName')}
          required
        />
        <FormField
          label="Registered Keeper Address"
          error={errors.registeredKeeperAddress?.message as string}
          {...register('registeredKeeperAddress')}
        />
        <FormField
          label="Vehicle Make"
          error={errors.vehicleMake?.message as string}
          {...register('vehicleMake')}
          required
        />
        <FormField
          label="Vehicle Model"
          error={errors.vehicleModel?.message as string}
          {...register('vehicleModel')}
          required
        />
        <FormField
          label="Vehicle VRN"
          error={errors.vehicleVRN?.message as string}
          {...register('vehicleVRN')}
          required
        />
        <FormField
          label="Insurance Company"
          error={errors.insuranceCompany?.message as string}
          {...register('insuranceCompany')}
          required
        />
        <FormField
          label="Policy Number"
          error={errors.policyNumber?.message as string}
          {...register('policyNumber')}
          required
        />
        <FormField
          type="number"
          label="Policy Excess (£)"
          error={errors.policyExcess?.message as string}
          {...register('policyExcess', {
            setValueAs: (v) => v === "" ? undefined : parseFloat(v)
          })}
          min="0"
          step="0.01"
        />
      </div>
    </div>
  );
};

export default VehicleDetails;