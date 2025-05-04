import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const RecoveryDetails = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const includeRecovery = watch('recovery.enabled');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Recovery Details</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register('recovery.enabled')}
            className="form-checkbox"
            onChange={(e) => {
              const checked = e.target.checked;
              setValue('recovery.enabled', checked);
              if (!checked) {
                // Reset recovery fields when disabled
                setValue('recovery.date', '');
                setValue('recovery.locationPickup', '');
                setValue('recovery.locationDropoff', '');
                setValue('recovery.cost', undefined); // CHANGE HERE
              }
            }}
          />
          <span>Include Recovery</span>
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
