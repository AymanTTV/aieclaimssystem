// src/components/claims/ClaimForm/sections/StorageDetails.tsx

import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';

const StorageDetails = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const includeStorage = watch('storage.enabled');
  const startDate = watch('storage.startDate');
  const endDate = watch('storage.endDate');
  const costPerDay = watch('storage.costPerDay');

  // Calculate total cost when dates or cost per day changes
  React.useEffect(() => {
    if (includeStorage && startDate && endDate && costPerDay) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const totalCost = days * Number(costPerDay);
      setValue('storage.totalCost', totalCost);
    }
  }, [includeStorage, startDate, endDate, costPerDay, setValue]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">Storage Details</h3>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('storage.enabled')}
            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          <span className="text-sm font-bold text-gray-950">Include Storage Details</span>
        </label>
      </div>

      {includeStorage && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            type="date"
            label="Start Date"
            error={errors.storage?.startDate?.message as string}
            {...register('storage.startDate')}
            required
          />
          
          <FormField
            type="date"
            label="End Date"
            error={errors.storage?.endDate?.message as string}
            {...register('storage.endDate')}
            required
            min={startDate}
          />
          
          <FormField
            type="number"
            label="Cost per Day (£)"
            error={errors.storage?.costPerDay?.message as string}
            {...register('storage.costPerDay', {
              setValueAs: (v: string) => Number(v),
              valueAsNumber: true
            })}
            required
            min="0"
            step="1"
            defaultValue="40"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Cost (£)</label>
            <input
              type="text"
              value={watch('storage.totalCost')?.toFixed(2) || '0.00'}
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
              readOnly
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageDetails;
