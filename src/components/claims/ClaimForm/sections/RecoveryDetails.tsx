// src/components/claims/ClaimForm/sections/RecoveryDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const RecoveryDetails = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const includeRecovery = watch('recovery.enabled');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Recovery Details</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register('recovery.enabled')}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Include Recovery</span>
        </label>
      </div>

      {includeRecovery && (
        <div className="space-y-4">
          <FormField
            type="date"
            label="Recovery Date"
            error={errors.recovery?.date?.message as string}
            {...register('recovery.date')}
            required
          />
          
          <FormField
            label="Pickup Location"
            error={errors.recovery?.locationPickup?.message as string}
            {...register('recovery.locationPickup')}
            required
          />
          
          <FormField
            label="Drop-off Location"
            error={errors.recovery?.locationDropoff?.message as string}
            {...register('recovery.locationDropoff')}
            required
          />
          
          <FormField
            type="number"
            label="Recovery Cost (£)"
            error={errors.recovery?.cost?.message as string}
            {...register('recovery.cost', { valueAsNumber: true })}
            required
            min="0"
            step="1"
          />

        </div>
      )}
    </div>
  );
};

export default RecoveryDetails;