// src/components/claims/ClaimForm/sections/FaultPartyDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const FaultPartyDetails = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">Third Party / Fault Party Information</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Name */}
        <FormField
          label="Third Party Full Name"
          error={errors.thirdParty?.name?.message as string}
          {...register('thirdParty.name')}
          required
          placeholder="Enter third party's name"
        />

        {/* Phone Number */}
        <FormField
          type="tel"
          label="Contact Phone Number"
          error={errors.thirdParty?.phone?.message as string}
          {...register('thirdParty.phone')}
          required
          placeholder="Enter third party contact number"
        />

        {/* Email */}
        <FormField
          type="email"
          label="Email Address (Optional)"
          error={errors.thirdParty?.email?.message as string}
          {...register('thirdParty.email')}
          placeholder="Enter email address if known"
        />

        {/* Vehicle Registration */}
        <FormField
          label="Vehicle Registration"
          error={errors.thirdParty?.registration?.message as string}
          {...register('thirdParty.registration')}
          required
          placeholder="e.g. AB12 CDE"
        />

        {/* Address */}
        <div className="col-span-1 md:col-span-2">
          <TextArea
            label="Third Party Address"
            error={errors.thirdParty?.address?.message as string}
            {...register('thirdParty.address')}
            required
            rows={3}
            placeholder="Enter third party full residential or business address"
          />
        </div>
      </div>

      {/* Warning Message */}
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 flex items-start gap-3">
        <span className="text-base leading-none">ℹ️</span>
        <p className="text-xs font-semibold text-amber-900 leading-relaxed">
          Please ensure all third party details are accurate as they are crucial for notifying insurers and recovering costs.
        </p>
      </div>
    </div>
  );
};

export default FaultPartyDetails;
