// src/components/claims/ClaimForm/sections/WitnessInformation.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

interface WitnessDetailsProps {
  count: number;
  onCountChange: (count: number) => void;
}

const WitnessDetails: React.FC<WitnessDetailsProps> = ({ count, onCountChange }) => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Witness Details</h3>
        <select
          value={count}
          onChange={(e) => onCountChange(parseInt(e.target.value))}
          className="block rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
        >
          <option value="0">No witnesses</option>
          {[1, 2, 3].map(num => (
            <option key={num} value={num}>{num} witness{num !== 1 ? 'es' : ''}</option>
          ))}
        </select>
      </div>

      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Witness {index + 1}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name"
              {...register(`witnesses.${index}.name`)}
              error={errors?.witnesses?.[index]?.name?.message as string}
            />
            <FormField
              label="Address"
              {...register(`witnesses.${index}.address`)}
              error={errors?.witnesses?.[index]?.address?.message as string}
            />
            <FormField
              label="Post Code"
              {...register(`witnesses.${index}.postCode`)}
              error={errors?.witnesses?.[index]?.postCode?.message as string}
            />
            <FormField
              type="date"
              label="Date of Birth"
              {...register(`witnesses.${index}.dob`)}
              error={errors?.witnesses?.[index]?.dob?.message as string}
            />
            <FormField
              type="tel"
              label="Contact Number"
              {...register(`witnesses.${index}.contactNumber`)}
              error={errors?.witnesses?.[index]?.contactNumber?.message as string}
            />
          </div>
        </div>
      ))}

      {count > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Please ensure all witness details are accurate and complete. This information may be required for the claim process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WitnessDetails;
