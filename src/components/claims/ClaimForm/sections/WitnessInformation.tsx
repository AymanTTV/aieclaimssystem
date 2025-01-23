// src/components/claims/ClaimForm/sections/WitnessInformation.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const WitnessInformation = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const includeWitness = watch('witness.enabled');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Witness Information</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register('witness.enabled')}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Include Witness</span>
        </label>
      </div>

      {includeWitness && (
        <div className="space-y-4">
          <FormField
            label="Name"
            error={errors.witness?.name?.message as string}
            {...register('witness.name')}
            required
          />
          
          <TextArea
            label="Address"
            error={errors.witness?.address?.message as string}
            {...register('witness.address')}
            required
          />
          
          <FormField
            type="tel"
            label="Phone"
            error={errors.witness?.phone?.message as string}
            {...register('witness.phone')}
            required
          />
          
          <FormField
            type="email"
            label="Email"
            error={errors.witness?.email?.message as string}
            {...register('witness.email')}
          />
        </div>
      )}
    </div>
  );
};

export default WitnessInformation;