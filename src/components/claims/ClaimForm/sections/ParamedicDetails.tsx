import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const ParamedicDetails = () => {
  // 1. Get 'getValues' from the form context
  const { register, formState: { errors }, getValues } = useFormContext();

  // 2. Check if any paramedic data exists when the component first loads
  const hasInitialParamedicData = React.useMemo(() => {
    const values = getValues();
    return !!(
      values.paramedicNames ||
      values.ambulanceReference ||
      values.ambulanceService
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getValues]); 

  // 3. Use this check to set the *initial* state
  const [paramedicInvolved, setParamedicInvolved] = React.useState(hasInitialParamedicData);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Paramedic Information</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Were paramedics involved?</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          // 4. Control the dropdown's value with state
          value={paramedicInvolved ? 'yes' : 'no'}
          onChange={(e) => setParamedicInvolved(e.target.value === 'yes')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      {paramedicInvolved && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Names of Paramedics"
            {...register('paramedicNames')}
            error={errors.paramedicNames?.message as string}
            placeholder="Enter paramedic names"
          />

          <FormField
            label="Ambulance Reference"
            {...register('ambulanceReference')}
            error={errors.ambulanceReference?.message as string}
            placeholder="Enter reference number"
          />

          <FormField
            label="Ambulance Service"
            {...register('ambulanceService')}
            error={errors.ambulanceService?.message as string}
            placeholder="Enter ambulance service name"
          />
        </div>
      )}
    </div>
  );
};

export default ParamedicDetails;