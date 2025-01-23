// src/components/claims/ClaimForm/sections/ParamedicDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const ParamedicDetails = () => {
  const { register, formState: { errors } } = useFormContext();
  const [paramedicInvolved, setParamedicInvolved] = React.useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Paramedic Information</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Were paramedics involved?</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          onChange={(e) => setParamedicInvolved(e.target.value === 'yes')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      {paramedicInvolved && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ambulance Number */}
          <FormField
            label="Ambulance Number"
            {...register('ambulanceReference')}
            error={errors.ambulanceReference?.message as string}
            placeholder="Enter ambulance number"
          />

          {/* Hospital */}
          <FormField
            label="Hospital"
            {...register('ambulanceService')}
            error={errors.ambulanceService?.message as string}
            placeholder="Enter hospital name"
          />

          {/* Date */}
          <FormField
            type="date"
            label="Date"
            {...register('paramedicDate')}
            error={errors.paramedicDate?.message as string}
          />

          {/* Time */}
          <FormField
            type="time"
            label="Time"
            {...register('paramedicTime')}
            error={errors.paramedicTime?.message as string}
          />

          {/* Additional Notes */}
          <div className="col-span-2">
            <TextArea
              label="Additional Notes"
              {...register('paramedicNotes')}
              error={errors.paramedicNotes?.message as string}
              placeholder="Add any additional information about paramedic involvement"
            />
          </div>
        </div>
      )}

      {paramedicInvolved && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Medical information is sensitive and will be handled with appropriate confidentiality.
                Please ensure all details are accurate as they may be required for the claim process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParamedicDetails;
