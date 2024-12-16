import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const WitnessDetails = () => {
  const { register, formState: { errors } } = useFormContext();
  const [hasWitness, setHasWitness] = React.useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Witness Details</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Were there any witnesses?</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          onChange={(e) => setHasWitness(e.target.value === 'yes')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      {hasWitness && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Name"
            {...register('witnessName')}
            error={errors.witnessName?.message as string}
          />
          <FormField
            label="Address"
            {...register('witnessAddress')}
            error={errors.witnessAddress?.message as string}
          />
          <FormField
            label="Post Code"
            {...register('witnessPostCode')}
            error={errors.witnessPostCode?.message as string}
          />
          <FormField
            type="date"
            label="Date of Birth"
            {...register('witnessDOB')}
            error={errors.witnessDOB?.message as string}
          />
          <FormField
            type="tel"
            label="Contact Number"
            {...register('witnessContact')}
            error={errors.witnessContact?.message as string}
          />
        </div>
      )}
    </div>
  );
};

export default WitnessDetails;