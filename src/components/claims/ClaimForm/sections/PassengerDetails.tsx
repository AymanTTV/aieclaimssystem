// src/components/claims/ClaimForm/sections/PassengerDetails.tsx

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
            {/* Name */}
            <FormField
              label="Name"
              error={errors?.passengers?.[index]?.name?.message as string}
              {...register(`passengers.${index}.name`)}
              required
              placeholder="Enter passenger's name"
            />

            {/* Phone Number */}
            <FormField
              type="tel"
              label="Phone Number"
              error={errors?.passengers?.[index]?.phone?.message as string}
              {...register(`passengers.${index}.phone`)}
              required
              placeholder="Enter contact number"
            />

            {/* Email */}
            <FormField
              type="email"
              label="Email"
              error={errors?.passengers?.[index]?.email?.message as string}
              {...register(`passengers.${index}.email`)}
              placeholder="Enter email address"
            />

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select
                {...register(`passengers.${index}.gender`)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                required
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors?.passengers?.[index]?.gender && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.passengers[index].gender.message as string}
                </p>
              )}
            </div>

            {/* Address */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <textarea
                {...register(`passengers.${index}.address`)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                required
                placeholder="Enter full address"
              />
              {errors?.passengers?.[index]?.address && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.passengers[index].address.message as string}
                </p>
              )}
            </div>
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
