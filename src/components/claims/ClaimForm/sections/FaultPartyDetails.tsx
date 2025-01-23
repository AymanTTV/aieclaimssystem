// src/components/claims/ClaimForm/sections/FaultPartyDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const FaultPartyDetails = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Third Party Information</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
        <FormField
          label="Name"
          error={errors.thirdParty?.name?.message as string}
          {...register('thirdParty.name')}
          required
          placeholder="Enter third party's name"
        />

        {/* Phone Number */}
        <FormField
          type="tel"
          label="Phone Number"
          error={errors.thirdParty?.phone?.message as string}
          {...register('thirdParty.phone')}
          required
          placeholder="Enter contact number"
        />

        {/* Email */}
        <FormField
          type="email"
          label="Email"
          error={errors.thirdParty?.email?.message as string}
          {...register('thirdParty.email')}
          placeholder="Enter email address"
        />

        {/* Vehicle Registration */}
        <FormField
          label="Vehicle Registration"
          error={errors.thirdParty?.registration?.message as string}
          {...register('thirdParty.registration')}
          required
          placeholder="Enter vehicle registration"
        />

        {/* Address */}
        <div className="col-span-2">
          <TextArea
            label="Address"
            error={errors.thirdParty?.address?.message as string}
            {...register('thirdParty.address')}
            required
            placeholder="Enter full address"
          />
        </div>
      </div>

      {/* Warning Message */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Please ensure all third party details are accurate as they are crucial for the claim process.
              If certain information is not available at the time of reporting, it can be updated later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaultPartyDetails;
