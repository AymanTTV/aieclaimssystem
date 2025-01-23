// src/components/claims/ClaimForm/sections/DriverDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import SignaturePad from '../../../ui/SignaturePad';

const DriverDetails = () => {
  const { register, formState: { errors }, setValue, watch } = useFormContext();
  const signature = watch('driverSignature');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Driver Details</h3>
      <div className="grid grid-cols-2 gap-4">
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
          label="Mobile Number"
          error={errors.driverMobile?.message as string}
          {...register('driverMobile')}
          required
        />

        <FormField
          type="email"
          label="Email Address"
          error={errors.driverEmail?.message as string}
          {...register('driverEmail')}
          required
        />

        <FormField
          label="National Insurance Number"
          error={errors.driverNIN?.message as string}
          {...register('driverNIN')}
          required
        />

        {/* Signature Section - Full Width */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Driver Signature
          </label>
          <div className="w-full">
            <SignaturePad
              value={signature}
              onChange={(value) => setValue('driverSignature', value)}
              className="w-full"
            />
          </div>
          {errors.driverSignature && (
            <p className="mt-1 text-sm text-red-600">
              {errors.driverSignature.message as string}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDetails;
