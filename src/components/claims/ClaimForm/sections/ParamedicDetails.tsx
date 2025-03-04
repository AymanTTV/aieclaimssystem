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
