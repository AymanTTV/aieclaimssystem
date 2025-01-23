// src/components/claims/ClaimForm/sections/PoliceDetails.tsx

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
          {/* CAD Number */}
          <FormField
            label="CAD Number"
            {...register('policeIncidentNumber')}
            error={errors.policeIncidentNumber?.message as string}
            placeholder="Enter CAD number"
          />

          {/* Police Station */}
          <FormField
            label="Police Station"
            {...register('policeStation')}
            error={errors.policeStation?.message as string}
            placeholder="Enter police station"
          />

          {/* Police Contact Number */}
          <FormField
            type="tel"
            label="Police Contact Number"
            {...register('policeContactInfo')}
            error={errors.policeContactInfo?.message as string}
            placeholder="Enter contact number"
          />

          {/* Additional Notes */}
          <div className="col-span-2">
            <TextArea
              label="Additional Notes"
              {...register('policeNotes')}
              error={errors.policeNotes?.message as string}
              placeholder="Add any additional information about police involvement"
            />
          </div>
        </div>
      )}

      {policeInvolved && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Please ensure all police-related information is accurate. This may be important for the claim process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliceDetails;
