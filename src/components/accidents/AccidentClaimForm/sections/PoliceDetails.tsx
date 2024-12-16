import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const PoliceDetails = () => {
  const { register, formState: { errors } } = useFormContext();
  const [policeInvolved, setPoliceInvolved] = React.useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Police Information</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Were the police involved?</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          onChange={(e) => setPoliceInvolved(e.target.value === 'yes')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      {policeInvolved && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Officer Name"
            {...register('policeOfficerName')}
            error={errors.policeOfficerName?.message as string}
          />
          <FormField
            label="Badge Number"
            {...register('policeBadgeNumber')}
            error={errors.policeBadgeNumber?.message as string}
          />
          <FormField
            label="Police Station"
            {...register('policeStation')}
            error={errors.policeStation?.message as string}
          />
          <FormField
            label="Incident Number (CAD No)"
            {...register('policeIncidentNumber')}
            error={errors.policeIncidentNumber?.message as string}
          />
          <div className="md:col-span-2">
            <TextArea
              label="Additional Contact Information"
              {...register('policeContactInfo')}
              error={errors.policeContactInfo?.message as string}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliceDetails;