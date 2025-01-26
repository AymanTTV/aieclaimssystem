import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

interface PassengerDetailsProps {
  count: number;
  onCountChange: (count: number) => void;
}

const PassengerDetails: React.FC<PassengerDetailsProps> = ({ count, onCountChange }) => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Passenger Details</h3>
        <select
          value={count}
          onChange={(e) => onCountChange(parseInt(e.target.value))}
          className="block rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="0">No passengers</option>
          {[1, 2, 3, 4].map(num => (
            <option key={num} value={num}>{num} passenger{num !== 1 ? 's' : ''}</option>
          ))}
        </select>
      </div>

      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Passenger {index + 1}</h4>
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

      {count > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Please ensure all passenger details are accurate and complete. This information may be required for the claim process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassengerDetails;