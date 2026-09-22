// src/components/claims/ClaimForm/sections/SubmitterDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';

const SubmitterDetails = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">Submitter Details</h3>
        <span
          className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 shadow-2xs shrink-0"
          title="Compulsory field - Must fill in"
        >
          <span className="text-red-600 font-black text-xs leading-none">*</span> Must fill in
        </span>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-900 mb-2">Submitter Type</label>
        <div className="flex flex-wrap gap-4">
          <label className="inline-flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors">
            <input
              type="radio"
              {...register('submitterType')}
              value="company"
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
            />
            <span className="ml-2.5 text-sm font-semibold text-gray-900">Company Fleet</span>
          </label>
          <label className="inline-flex items-center p-3 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs transition-colors">
            <input
              type="radio"
              {...register('submitterType')}
              value="client"
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
            />
            <span className="ml-2.5 text-sm font-semibold text-gray-900">Client</span>
          </label>
        </div>
        {errors.submitterType && (
          <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
            <span>⚠️</span> {errors.submitterType.message as string}
          </p>
        )}
      </div>
    </div>
  );
};

export default SubmitterDetails;
