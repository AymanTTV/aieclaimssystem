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

const CLAIM_REASONS = [
  { value: 'VD', label: 'VD' },
  { value: 'H', label: 'H' },
  { value: 'S', label: 'S' },
  { value: 'PI', label: 'PI' }
] as const;

// Helper function to convert old claim reason format to new array format
const convertOldClaimReason = (oldReason: string): string[] => {
  switch (oldReason) {
    case 'VD Only':
      return ['VD'];
    case 'VDHS':
      return ['VD', 'H', 'S'];
    case 'VDH':
      return ['VD', 'H'];
    case 'VDHSPI':
      return ['VD', 'H', 'S', 'PI'];
    case 'PI':
      return ['PI'];
    default:
      return oldReason.split(',').map(r => r.trim()); // Handle comma-separated format
  }
};

const ClaimProgress = () => {
  const { register, formState: { errors }, watch, setValue } = useFormContext();
  const progressHistory = watch('progressHistory') || [];
  const selectedReasons = watch('claimReason') || [];

  // Convert old format to new array format if needed
  React.useEffect(() => {
    const currentReason = watch('claimReason');
    
    // Check if it's a string (old format) or not an array
    if (typeof currentReason === 'string' || !Array.isArray(currentReason)) {
      const newReasons = convertOldClaimReason(currentReason as string);
      setValue('claimReason', newReasons);
    }
  }, [watch, setValue]);

  // Handle multiple claim reason selection
  const handleReasonChange = (value: string) => {
    const currentReasons = Array.isArray(selectedReasons) ? selectedReasons : [];
    const newReasons = currentReasons.includes(value)
      ? currentReasons.filter(r => r !== value)
      : [...currentReasons, value];
    setValue('claimReason', newReasons);
  };

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
            <option value="PCO">PCO</option>
          </select>
          {errors.claimType && (
            <p className="mt-1 text-sm text-red-600">{errors.claimType.message as string}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Claim Reason</label>
          <div className="mt-2 space-y-2">
            {CLAIM_REASONS.map((reason) => (
              <label key={reason.value} className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  checked={Array.isArray(selectedReasons) ? selectedReasons.includes(reason.value) : false}
                  onChange={() => handleReasonChange(reason.value)}
                  className="form-checkbox text-primary rounded"
                />
                <span className="ml-2">{reason.label}</span>
              </label>
            ))}
          </div>
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

        {/* <div>
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
          />
        </div> */}
      </div>
    </div>
  );
};

export default ClaimProgress;