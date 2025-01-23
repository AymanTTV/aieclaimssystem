// src/components/claims/ClaimForm/sections/FileHandlers.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const FileHandlers = () => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">File Handlers</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="AIE Handler"
          error={errors.fileHandlers?.aieHandler?.message as string}
          {...register('fileHandlers.aieHandler')}
          required
        />
        
        <FormField
          label="Legal Handler"
          error={errors.fileHandlers?.legalHandler?.message as string}
          {...register('fileHandlers.legalHandler')}
          required
        />
      </div>
    </div>
  );
};

export default FileHandlers;