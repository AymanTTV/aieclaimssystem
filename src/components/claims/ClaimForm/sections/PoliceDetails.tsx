import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const PoliceDetails = () => {
  // 1. Get 'getValues' from the form context
  const { register, formState: { errors }, getValues } = useFormContext();

  // 2. Check if any police data exists *when the component first loads*
  //    This logic now reads the form state, which ClaimEditModal has correctly populated.
  const hasInitialPoliceData = React.useMemo(() => {
    const values = getValues();
    return !!(
      values.policeOfficerName ||
      values.policeBadgeNumber ||
      values.policeStation ||
      values.policeIncidentNumber ||
      values.policeContactInfo
    );
    // We only want this to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getValues]); 

  // 3. Use this check to set the *initial* state
  const [policeInvolved, setPoliceInvolved] = React.useState(hasInitialPoliceData);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Police Information</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Were the police involved?</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          // 4. Control the dropdown's value *with state*
          value={policeInvolved ? 'yes' : 'no'}
          // 5. When it changes, update both the local state and the form
          onChange={(e) => setPoliceInvolved(e.target.value === 'yes')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      {policeInvolved && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Officer's Name"
            {...register('policeOfficerName')}
            error={errors.policeOfficerName?.message as string}
            placeholder="Enter officer's name"
          />

          <FormField
            label="Badge/ID Number"
            {...register('policeBadgeNumber')}
            error={errors.policeBadgeNumber?.message as string}
            placeholder="Enter badge number"
          />

          <FormField
            label="Police Station"
            {...register('policeStation')}
            error={errors.policeStation?.message as string}
            placeholder="Enter police station"
          />

          <FormField
            label="Incident Number (CAD No)"
            {...register('policeIncidentNumber')}
            error={errors.policeIncidentNumber?.message as string}
            placeholder="Enter incident number"
          />

          <div className="col-span-2">
            <TextArea
              label="Additional Contact Information"
              {...register('policeContactInfo')}
              error={errors.policeContactInfo?.message as string}
              placeholder="Add any additional contact information"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliceDetails;