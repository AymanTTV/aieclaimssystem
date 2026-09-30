// src/components/claims/ClaimForm/sections/FileHandlers.tsx

import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import LegalHandlerDropdown from '../../LegalHandlerDropdown';

const FileHandlers = () => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">File Handlers</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="AIE Handler"
          error={errors.fileHandlers?.aieHandler?.message as string}
          {...register('fileHandlers.aieHandler')}
          required
          placeholder="Enter AIE handler name"
        />

        <div>
          <label className="block text-sm font-bold text-gray-950 mb-1.5">
            Legal Handler <span className="text-red-500 font-bold select-none" aria-hidden="true">*</span>
          </label>
          <Controller
            name="fileHandlers.legalHandler"
            control={control}
            render={({ field }) => (
              <LegalHandlerDropdown
                value={field.value}
                onChange={field.onChange}
                error={errors.fileHandlers?.legalHandler?.message as string}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default FileHandlers;
