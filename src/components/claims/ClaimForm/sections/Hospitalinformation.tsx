import React, { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import TextArea from '../../../ui/TextArea';

const Hospitalinformation = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const hospitalInformation = watch('hospitalInformation');
  const [hospitalInvolved, setHospitalInvolved] = React.useState(hospitalInformation?.visited || false);

  useEffect(() => {
    setHospitalInvolved(hospitalInformation?.visited || false);
  }, [hospitalInformation?.visited]);

  const handleHospitalInvolvedChange = (value: boolean) => {
    setHospitalInvolved(value);
    setValue('hospitalInformation.visited', value);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Hospital Information</h3>

      <div>
        <label className="block text-sm font-medium text-gray-700">Did you go to the Hospital?</label>
        <select
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          value={hospitalInvolved ? 'yes' : 'no'}
          onChange={(e) => handleHospitalInvolvedChange(e.target.value === 'yes')}
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      {hospitalInvolved && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Name of the Hospital"
            {...register('hospitalInformation.hospitalName')}
            error={errors.hospitalInformation?.hospitalName?.message as string}
            placeholder="Enter Hospital name"
          />

          <FormField
            label="Address"
            {...register('hospitalInformation.hospitalAddress')}
            error={errors.hospitalInformation?.hospitalAddress?.message as string}
            placeholder="Enter Hospital address"
          />

          <FormField
            label="Doctor Name"
            {...register('hospitalInformation.hospitalDoctorName')}
            error={errors.hospitalInformation?.hospitalDoctorName?.message as string}
            placeholder="Enter doctor's name"
          />

          <FormField
            type="date"
            label="Date"
            {...register('hospitalInformation.hospitalDate')}
            error={errors.hospitalInformation?.hospitalDate?.message as string}
          />

          <FormField
            label="Contact Number"
            {...register('hospitalInformation.hospitalContactNumber')}
            error={errors.hospitalInformation?.hospitalContactNumber?.message as string}
            placeholder="Enter contact number"
          />

          <div className="col-span-2">
            <TextArea
              label="Additional Notes"
              {...register('hospitalInformation.hospitalNotes')}
              error={errors.hospitalInformation?.hospitalNotes?.message as string}
              placeholder="Add any additional information about Hospital visit"
            />
          </div>
        </div>
      )}

      {hospitalInvolved && (
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

export default Hospitalinformation;