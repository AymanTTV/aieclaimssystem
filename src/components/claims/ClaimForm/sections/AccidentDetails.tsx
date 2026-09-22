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
      <div className="pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">Accident / Incident Details</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          type="date"
          label="Accident Date"
          max={today}
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

        <div className="col-span-1 md:col-span-2">
          <FormField
            label="Accident Location"
            placeholder="Enter street, road name, town or junction where incident occurred"
            error={errors.incidentDetails?.location?.message as string}
            {...register('incidentDetails.location')}
            required
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <TextArea
            label="Description of Incident"
            placeholder="Detailed description of what occurred before, during and after the collision..."
            error={errors.incidentDetails?.description?.message as string}
            {...register('incidentDetails.description')}
            required
            rows={4}
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <TextArea
            label="Damage Details"
            placeholder="Detail all damage to client vehicle, third party vehicle or road furniture..."
            error={errors.incidentDetails?.damageDetails?.message as string}
            {...register('incidentDetails.damageDetails')}
            required
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};

export default AccidentDetails;
