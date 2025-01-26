import React from 'react';
import { useFormContext } from 'react-hook-form';
import FormField from '../../../ui/FormField';
import { differenceInDays } from 'date-fns';

const HireDetails = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const includeHire = watch('hireDetails.enabled');
  const startDate = watch('hireDetails.startDate');
  const endDate = watch('hireDetails.endDate');
  const claimRate = watch('hireDetails.claimRate') || 340;
  const deliveryCharge = watch('hireDetails.deliveryCharge') || 0;
  const collectionCharge = watch('hireDetails.collectionCharge') || 0;
  const insurancePerDay = watch('hireDetails.insurancePerDay') || 0;

  // Calculate days of hire and total cost
  React.useEffect(() => {
    if (includeHire && startDate && endDate) {
      const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
      setValue('hireDetails.daysOfHire', days);

      // Calculate total cost
      const totalCost = (days * Number(claimRate)) + 
                       Number(deliveryCharge) + 
                       Number(collectionCharge) + 
                       (days * Number(insurancePerDay));
      setValue('hireDetails.totalCost', totalCost);
    }
  }, [startDate, endDate, claimRate, deliveryCharge, collectionCharge, insurancePerDay, includeHire, setValue]);

  // When hire details are disabled, clear all values
  React.useEffect(() => {
    if (!includeHire) {
      setValue('hireDetails', { enabled: false });
    }
  }, [includeHire, setValue]);

  if (!includeHire) {
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
      </div>
    );
  }

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
        <>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              type="date"
              label="Start Date"
              {...register('hireDetails.startDate')}
              error={errors.hireDetails?.startDate?.message as string}
            />
            
            <FormField
              type="time"
              label="Start Time"
              {...register('hireDetails.startTime')}
              error={errors.hireDetails?.startTime?.message as string}
            />
            
            <FormField
              type="date"
              label="End Date"
              {...register('hireDetails.endDate')}
              error={errors.hireDetails?.endDate?.message as string}
              min={startDate}
            />
            
            <FormField
              type="time"
              label="End Time"
              {...register('hireDetails.endTime')}
              error={errors.hireDetails?.endTime?.message as string}
            />

            <FormField
              type="number"
              label="Days of Hire"
              {...register('hireDetails.daysOfHire', { valueAsNumber: true })}
              error={errors.hireDetails?.daysOfHire?.message as string}
              readOnly
            />

            <FormField
              type="number"
              label="Claim Rate per Day (£)"
              {...register('hireDetails.claimRate', { valueAsNumber: true })}
              defaultValue={340}
              min="0"
              step="1"
            />

            <FormField
              type="number"
              label="Delivery Charge (£)"
              {...register('hireDetails.deliveryCharge', { valueAsNumber: true })}
              defaultValue={0}
              min="0"
              step="1"
            />

            <FormField
              type="number"
              label="Collection Charge (£)"
              {...register('hireDetails.collectionCharge', { valueAsNumber: true })}
              defaultValue={0}
              min="0"
              step="1"
            />

            <FormField
              type="number"
              label="Insurance per Day (£)"
              {...register('hireDetails.insurancePerDay', { valueAsNumber: true })}
              defaultValue={0}
              min="0"
              step="1"
            />

            <FormField
              type="number"
              label="Total Cost (£)"
              {...register('hireDetails.totalCost', { valueAsNumber: true })}
              readOnly
              disabled
            />
          </div>

          {/* Vehicle Details */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-4">Hire Vehicle Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Vehicle Make"
                {...register('hireDetails.vehicle.make')}
                error={errors.hireDetails?.vehicle?.make?.message as string}
              />
              
              <FormField
                label="Vehicle Model"
                {...register('hireDetails.vehicle.model')}
                error={errors.hireDetails?.vehicle?.model?.message as string}
              />
              
              <FormField
                label="Registration Number"
                {...register('hireDetails.vehicle.registration')}
                error={errors.hireDetails?.vehicle?.registration?.message as string}
              />
              
              <FormField
                type="number"
                label="Claim Rate (£/day)"
                {...register('hireDetails.vehicle.claimRate', { valueAsNumber: true })}
                error={errors.hireDetails?.vehicle?.claimRate?.message as string}
                min="0"
                step="1"
                defaultValue={340}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HireDetails;
