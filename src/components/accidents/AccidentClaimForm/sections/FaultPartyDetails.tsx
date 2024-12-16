import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const FaultPartyDetails = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Fault Party Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Name"
          error={errors.faultPartyName?.message as string}
          {...register('faultPartyName')}
          required
        />
        <FormField
          label="Address"
          error={errors.faultPartyAddress?.message as string}
          {...register('faultPartyAddress')}
        />
        <FormField
          label="Post Code"
          error={errors.faultPartyPostCode?.message as string}
          {...register('faultPartyPostCode')}
        />
        <FormField
          type="tel"
          label="Phone Number"
          error={errors.faultPartyPhone?.message as string}
          {...register('faultPartyPhone')}
        />
        <FormField
          label="Vehicle (Make and Model)"
          error={errors.faultPartyVehicle?.message as string}
          {...register('faultPartyVehicle')}
        />
        <FormField
          label="Vehicle Registration Number"
          error={errors.faultPartyVRN?.message as string}
          {...register('faultPartyVRN')}
          required
        />
        <FormField
          label="Insurance Company"
          error={errors.faultPartyInsurance?.message as string}
          {...register('faultPartyInsurance')}
        />
      </div>
    </div>
  );
};

export default FaultPartyDetails;