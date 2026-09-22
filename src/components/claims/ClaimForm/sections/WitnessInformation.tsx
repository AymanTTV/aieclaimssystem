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
      <div className="flex justify-between items-center pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">Witness Details</h3>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-800">Count:</label>
          <select
            value={count}
            onChange={(e) => onCountChange(parseInt(e.target.value))}
            className="block rounded-md border-gray-300 bg-white text-gray-950 font-bold shadow-2xs focus:border-primary focus:ring-primary sm:text-sm py-1.5 px-3"
          >
            <option value="0">No witnesses</option>
            {[1, 2, 3].map(num => (
              <option key={num} value={num}>{num} witness{num !== 1 ? 'es' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border border-gray-300 rounded-lg p-4 space-y-4 bg-slate-50/50">
          <h4 className="font-bold text-gray-950 text-sm">Witness {index + 1}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Name"
              placeholder="Witness full name"
              {...register(`witnesses.${index}.name`)}
              error={errors?.witnesses?.[index]?.name?.message as string}
            />
            <FormField
              label="Address"
              placeholder="Witness address"
              {...register(`witnesses.${index}.address`)}
              error={errors?.witnesses?.[index]?.address?.message as string}
            />
            <FormField
              label="Post Code"
              placeholder="e.g. SW1A 1AA"
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
              placeholder="e.g. 07123 456789"
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
