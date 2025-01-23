// src/components/claims/ClaimForm/sections/AccidentDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const AccidentDetails = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Accident Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Accident Date"
          error={errors.accidentDate?.message as string}
          {...register('accidentDate')}
          required
        />
        <FormField
          type="time"
          label="Accident Time"
          error={errors.accidentTime?.message as string}
          {...register('accidentTime')}
          required
        />
        <div className="col-span-2">
          <FormField
            label="Accident Location"
            error={errors.accidentLocation?.message as string}
            {...register('accidentLocation')}
            required
          />
        </div>
        <div className="col-span-2">
          <TextArea
            label="Description of Incident"
            error={errors.description?.message as string}
            {...register('description')}
            required
          />
        </div>
        <div className="col-span-2">
          <TextArea
            label="Damage Details"
            error={errors.damageDetails?.message as string}
            {...register('damageDetails')}
            required
          />
        </div>
      </div>
    </div>
  );
};

export default AccidentDetails;