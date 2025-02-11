import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import SignaturePad from '../../../ui/SignaturePad';

const DriverDetails = () => {
  const { register, formState: { errors }, setValue, watch } = useFormContext();
  const signature = watch('clientInfo.signature');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Client Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Name"
          error={errors.clientInfo?.name?.message as string}
          {...register('clientInfo.name')}
          required
        />

        <FormField
          label="Address"
          error={errors.clientInfo?.address?.message as string}
          {...register('clientInfo.address')}
          required
        />

        <FormField
          type="tel"
          label="Phone Number"
          error={errors.clientInfo?.phone?.message as string}
          {...register('clientInfo.phone')}
          required
        />

        <FormField
          type="email"
          label="Email"
          error={errors.clientInfo?.email?.message as string}
          {...register('clientInfo.email')}
          required
        />

        <FormField
          type="date"
          label="Date of Birth"
          error={errors.clientInfo?.dateOfBirth?.message as string}
          {...register('clientInfo.dateOfBirth')}
          required
        />

        <FormField
          label="National Insurance Number"
          error={errors.clientInfo?.nationalInsuranceNumber?.message as string}
          {...register('clientInfo.nationalInsuranceNumber')}
          required
        />

        {/* Signature Section */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Driver Signature
          </label>
          <SignaturePad
            value={signature || ''}
            onChange={(value) => setValue('clientInfo.signature', value)}
            className="mt-1 border rounded-md"
          />
          {errors.clientInfo?.signature && (
            <p className="mt-1 text-sm text-red-600">
              {errors.clientInfo.signature.message as string}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDetails;