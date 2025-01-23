// src/components/claims/ClaimForm/sections/SubmitterDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';

const SubmitterDetails = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Submitter Details</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700">Submitter Type</label>
        <div className="mt-2 space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              {...register('submitterType')}
              value="company"
              className="form-radio text-primary focus:ring-primary"
            />
            <span className="ml-2">Company Fleet</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              {...register('submitterType')}
              value="client"
              className="form-radio text-primary focus:ring-primary"
            />
            <span className="ml-2">Client</span>
          </label>
        </div>
        {errors.submitterType && (
          <p className="mt-1 text-sm text-red-600">{errors.submitterType.message as string}</p>
        )}
      </div>
    </div>
  );
};

export default SubmitterDetails;
