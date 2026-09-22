import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const RecoveryDetails = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const includeRecovery = watch('recovery.enabled');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">Recovery Details</h3>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('recovery.enabled')}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
            onChange={(e) => {
              const checked = e.target.checked;
              setValue('recovery.enabled', checked);
              if (!checked) {
                // Reset recovery fields when disabled
                setValue('recovery.date', '');
                setValue('recovery.locationPickup', '');
                setValue('recovery.locationDropoff', '');
                setValue('recovery.cost', undefined);
              }
            }}
          />
          <span className="text-sm font-bold text-gray-950">Include Recovery</span>
        </label>
      </div>

      {includeRecovery && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Recovery Date"
            type="date"
            error={errors?.recovery?.date?.message}
            {...register('recovery.date')}
          />
          <FormField
            label="Pickup Location"
            error={errors?.recovery?.locationPickup?.message}
            {...register('recovery.locationPickup')}
          />
          <FormField
            label="Dropoff Location"
            error={errors?.recovery?.locationDropoff?.message}
            {...register('recovery.locationDropoff')}
          />
          <FormField
            label="Recovery Cost (£)"
            type="number"
            error={errors?.recovery?.cost?.message}
            {...register('recovery.cost', { valueAsNumber: true })}
          />
        </div>
      )}
    </div>
  );
};

export default RecoveryDetails;
