import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const DriverDetails = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Driver Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Name"
          error={errors.driverName?.message as string}
          {...register('driverName')}
          required
        />
        <FormField
          label="Address"
          error={errors.driverAddress?.message as string}
          {...register('driverAddress')}
          required
        />
        <FormField
          label="Post Code"
          error={errors.driverPostCode?.message as string}
          {...register('driverPostCode')}
          required
        />
        <FormField
          type="date"
          label="Date of Birth"
          error={errors.driverDOB?.message as string}
          {...register('driverDOB')}
          required
        />
        <FormField
          type="tel"
          label="Telephone Number"
          error={errors.driverPhone?.message as string}
          {...register('driverPhone')}
          required
        />
        <FormField
          type="tel"
          label="Mobile Number"
          error={errors.driverMobile?.message as string}
          {...register('driverMobile')}
          required
        />
        <FormField
          label="National Insurance Number"
          error={errors.driverNIN?.message as string}
          {...register('driverNIN')}
          required
        />
      </div>
    </div>
  );
};

export default DriverDetails;