import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const GPInformation = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const gpInformation = watch('gpInformation');
  const [gpInvolved, setGpInvolved] = React.useState(gpInformation?.visited || false);

  useEffect(() => {
    setGpInvolved(gpInformation?.visited || false);
  }, [gpInformation?.visited]);

  const handleGpInvolvedChange = (value: boolean) => {
    setGpInvolved(value);
    setValue('gpInformation.visited', value);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">GP Information</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Did you go to the GP?</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          value={gpInvolved ? 'yes' : 'no'}
          onChange={(e) => handleGpInvolvedChange(e.target.value === 'yes')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      {gpInvolved && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Name of the GP"
            {...register('gpInformation.gpName')}
            error={errors.gpInformation?.gpName?.message as string}
            placeholder="Enter GP name"
          />

          <FormField
            label="Address"
            {...register('gpInformation.gpAddress')}
            error={errors.gpInformation?.gpAddress?.message as string}
            placeholder="Enter GP address"
          />

          <FormField
            label="Doctor Name"
            {...register('gpInformation.gpDoctorName')}
            error={errors.gpInformation?.gpDoctorName?.message as string}
            placeholder="Enter doctor's name"
          />

          <FormField
            type="date"
            label="Date"
            {...register('gpInformation.gpDate')}
            error={errors.gpInformation?.gpDate?.message as string}
          />

          <FormField
            label="Contact Number"
            {...register('gpInformation.gpContactNumber')}
            error={errors.gpInformation?.gpContactNumber?.message as string}
            placeholder="Enter contact number"
          />

          <div className="col-span-2">
            <TextArea
              label="Additional Notes"
              {...register('gpInformation.gpNotes')}
              error={errors.gpInformation?.gpNotes?.message as string}
              placeholder="Add any additional information about GP visit"
            />
          </div>
        </div>
      )}

      {gpInvolved && (
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

export default GPInformation;