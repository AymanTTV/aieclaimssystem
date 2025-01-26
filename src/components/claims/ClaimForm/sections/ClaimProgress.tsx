import React from 'react';
import { useFormContext } from 'react-hook-form';
import TextArea from '../../../ui/TextArea';

const PROGRESS_OPTIONS = [
  'Your Claim Has Started',
  'Reported to Legal Team',
  'Engineer Report Pending',
  'Awaiting TPI',
  'Claim in Progress',
  'Claim Complete'
] as const;

const ClaimProgress = () => {
  const { register, formState: { errors }, watch } = useFormContext();
  const progressHistory = watch('progressHistory') || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Claim Progress</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Claim Type</label>
          <select
            {...register('claimType')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="Domestic">Domestic</option>
            <option value="Taxi">Taxi</option>
            {/* <option value="PI">PI</option> */}
            <option value="PCO">PCO</option>
          </select>
          {errors.claimType && (
            <p className="mt-1 text-sm text-red-600">{errors.claimType.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Claim Reason</label>
          <select
            {...register('claimReason')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="VD Only">VD Only</option>
            <option value="VDHS">VDHS</option>
            <option value="VDH">VDH</option>
            {/* <option value="PI">PI</option> */}
            <option value="VDHSPI">VDHSPI</option>
          </select>
          {errors.claimReason && (
            <p className="mt-1 text-sm text-red-600">{errors.claimReason.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Case Progress</label>
          <select
            {...register('caseProgress')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            <option value="Awaiting">Awaiting</option>
            <option value="Win">Win</option>
            <option value="Lost">Lost</option>
            <option value="50/50">50/50</option>
          </select>
          {errors.caseProgress && (
            <p className="mt-1 text-sm text-red-600">{errors.caseProgress.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Progress Status</label>
          <select
            {...register('progress')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          >
            {PROGRESS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          {errors.progress && (
            <p className="mt-1 text-sm text-red-600">{errors.progress.message as string}</p>
          )}
        </div>

        <div className="col-span-2">
          <TextArea
            label="Status Description"
            {...register('statusDescription')}
            error={errors.statusDescription?.message as string}
            placeholder="Add notes about the current status..."
            required
          />
        </div>

        {/* Progress History */}
        <div className="col-span-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Progress History</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto bg-gray-50 p-4 rounded-lg">
            {progressHistory.map((progress: any, index: number) => (
              <div key={index} className="bg-white p-3 rounded shadow-sm">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{progress.status}</span>
                  <span className="text-gray-500">
                    {new Date(progress.date).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{progress.note}</p>
                <p className="text-xs text-gray-500 mt-1">By {progress.author}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimProgress;