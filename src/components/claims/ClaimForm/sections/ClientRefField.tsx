import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const ClientRefField = () => {
  const { register } = useFormContext();

  return (
    <div>
      <div className="pb-2 border-b border-gray-200 mb-4">
        <h3 className="text-lg font-bold text-gray-950">Client Reference</h3>
      </div>
      <FormField
        label="Client Reference (Optional)"
        {...register('clientRef')}
        placeholder="Enter reference number (if available)"
      />
    </div>
  );
};

export default ClientRefField;