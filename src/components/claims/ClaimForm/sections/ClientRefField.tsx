import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const ClientRefField = () => {
  const { register } = useFormContext();

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Client Reference</h3>
      <FormField
        label="Client Reference (Optional)"
        {...register('clientRef')}
        placeholder="Enter client reference number"
      />
    </div>
  );
};

export default ClientRefField;