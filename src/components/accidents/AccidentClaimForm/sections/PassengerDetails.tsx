import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const PassengerDetails = () => {
  const { register, formState: { errors }, watch } = useFormContext();
  const [hasPassengers, setHasPassengers] = React.useState(false);
  const [passengerCount, setPassengerCount] = React.useState(0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Passenger Details</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Were there any passengers?</label>
          <select
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
            onChange={(e) => setHasPassengers(e.target.value === 'yes')}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        {hasPassengers && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Number of Passengers</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              onChange={(e) => setPassengerCount(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {hasPassengers && [...Array(passengerCount)].map((_, index) => (
        <div key={index} className="p-4 border border-gray-200 rounded-lg">
          <h4 className="text-md font-medium mb-4">Passenger {index + 1}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name"
              {...register(`passengers.${index}.name`)}
              error={errors?.passengers?.[index]?.name?.message as string}
            />
            <FormField
              label="Address"
              {...register(`passengers.${index}.address`)}
              error={errors?.passengers?.[index]?.address?.message as string}
            />
            <FormField
              label="Post Code"
              {...register(`passengers.${index}.postCode`)}
              error={errors?.passengers?.[index]?.postCode?.message as string}
            />
            <FormField
              type="date"
              label="Date of Birth"
              {...register(`passengers.${index}.dob`)}
              error={errors?.passengers?.[index]?.dob?.message as string}
            />
            <FormField
              type="tel"
              label="Contact Number"
              {...register(`passengers.${index}.contactNumber`)}
              error={errors?.passengers?.[index]?.contactNumber?.message as string}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PassengerDetails;