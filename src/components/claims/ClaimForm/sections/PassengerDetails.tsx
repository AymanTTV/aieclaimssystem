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
      <div className="flex justify-between items-center pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">Passenger Details</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-800">Count:</label>
          <select
            value={count}
            onChange={(e) => onCountChange(parseInt(e.target.value))}
            className="block rounded-md border-gray-300 bg-white text-gray-950 font-bold shadow-2xs focus:border-primary focus:ring-primary sm:text-sm py-1.5 px-3"
          >
            <option value="0">No passengers</option>
            {[1, 2, 3, 4].map(num => (
              <option key={num} value={num}>{num} passenger{num !== 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-4 bg-slate-50/50">
          <h4 className="font-bold text-gray-950 text-sm">Passenger {index + 1}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name"
              placeholder="Passenger full name"
              {...register(`passengers.${index}.name`)}
              error={errors?.passengers?.[index]?.name?.message as string}
            />
            <FormField
              label="Address"
              placeholder="Passenger address"
              {...register(`passengers.${index}.address`)}
              error={errors?.passengers?.[index]?.address?.message as string}
            />
            <FormField
              label="Post Code"
              placeholder="e.g. SW1A 1AA"
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
              placeholder="e.g. 07123 456789"
              {...register(`passengers.${index}.contactNumber`)}
              error={errors?.passengers?.[index]?.contactNumber?.message as string}
            />
          </div>
        </div>
      ))}

      {count > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3.5 rounded-r-lg">
          <p className="text-xs font-semibold text-blue-900">
            Please ensure all passenger details are accurate and complete. This information is submitted with the claim file.
          </p>
        </div>
      )}
    </div>
  );
};

export default PassengerDetails;