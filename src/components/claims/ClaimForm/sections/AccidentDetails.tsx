// src/components/claims/ClaimForm/sections/AccidentDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const AccidentDetails = () => {
  const { register, formState: { errors } } = useFormContext();

  // Get today's date in YYYY-MM-DD format for max attribute
  const today = new Date().toISOString().split('T')[0];

  // Safely access nested errors
  const incidentErrors = errors.incidentDetails as Record<string, any> || {};

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Accident Details</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Accident Date"
          error={errors.incidentDetails?.date?.message as string}
          {...register('incidentDetails.date')}
          required
        />

        <FormField
          type="time"
          label="Accident Time"
          error={errors.incidentDetails?.time?.message as string}
          {...register('incidentDetails.time')}
          required
        />

        <div className="col-span-2">
          <FormField
            label="Accident Location"
            error={errors.incidentDetails?.location?.message as string}
            {...register('incidentDetails.location')}
            required
          />
        </div>

        <div className="col-span-2">
          <TextArea
            label="Description of Incident"
            error={errors.incidentDetails?.description?.message as string}
            {...register('incidentDetails.description')}
            required
          />
        </div>

        <div className="col-span-2">
          <TextArea
            label="Damage Details"
            error={errors.incidentDetails?.damageDetails?.message as string}
            {...register('incidentDetails.damageDetails')}
            required
          />
        </div>
      </div>
    </div>
  );
};

export default AccidentDetails;
