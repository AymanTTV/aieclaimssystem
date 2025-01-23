// src/components/claims/ClaimForm/sections/HireDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import { useVehicles } from '../../../../hooks/useVehicles';

const HireDetails = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const includeHire = watch('hireDetails.enabled');
  const { vehicles } = useVehicles();
  const selectedVehicleId = watch('hireDetails.vehicleId');

  // Update claim rate when vehicle is selected
  React.useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle) {
        setValue('hireDetails.vehicle', {
          make: vehicle.make,
          model: vehicle.model,
          registration: vehicle.registrationNumber,
          claimRate: vehicle.claimRentalPrice
        });
      }
    }
  }, [selectedVehicleId, vehicles, setValue]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Hire Details</h3>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register('hireDetails.enabled')}
            className="rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm text-gray-700">Include Hire Details</span>
        </label>
      </div>

      {includeHire && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            type="date"
            label="Start Date"
            error={errors.hireDetails?.startDate?.message as string}
            {...register('hireDetails.startDate')}
            required
          />
          
          <FormField
            type="time"
            label="Start Time"
            error={errors.hireDetails?.startTime?.message as string}
            {...register('hireDetails.startTime')}
            required
          />
          
          <FormField
            type="date"
            label="End Date"
            error={errors.hireDetails?.endDate?.message as string}
            {...register('hireDetails.endDate')}
            required
          />
          
          <FormField
            type="time"
            label="End Time"
            error={errors.hireDetails?.endTime?.message as string}
            {...register('hireDetails.endTime')}
            required
          />

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Hire Vehicle</label>
            <select
              {...register('hireDetails.vehicleId')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles
                .filter(v => v.status === 'available')
                .map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
                    {vehicle.claimRentalPrice && ` (£${vehicle.claimRentalPrice}/day)`}
                  </option>
                ))}
            </select>
            {errors.hireDetails?.vehicleId && (
              <p className="mt-1 text-sm text-red-600">
                {errors.hireDetails.vehicleId.message as string}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HireDetails;