import React from 'react';
import { useFormContext } from 'react-hook-form';
import TextArea from '../../../ui/TextArea';

const PROGRESS_OPTIONS = [
  'Your Claim Has Started',
  'Report to Legal Team - Pending',
  'TPI (Third Party Insurer) - Notified and Awaiting Response',
  'Engineer Report - Pending Completion',
  'Vehicle Damage Assessment - Scheduled',
  'Liability Accepted',
  'Liability Disputed',
  'TPI Refuses to Deal with Claim',
  'VD Completed Hire Pack - Awaiting Review',
  'Claim - Referred to MIB (Motor Insurers\' Bureau)',
  'MIB Claim - Under Review/In Progress',
  'Awaiting MIB Response/Decision',
  'MIB - Completed (Outcome Received)',
  'Client Documentation - Pending Submission',
  'Hire Pack - Successfully Submitted',
  'Accident Circumstances - Under Investigation',
  'MIB Claim - Initial Review in Progress',
  'Additional Information - Requested from Client',
  'Legal Notice - Issued to Third Party',
  'Court Proceedings - Initiated',
  'Settlement Offer - Under Review',
  'Client Approval - Pending for Settlement',
  'Negotiation with TPI - Ongoing',
  'Settlement Agreement - Finalized',
  'Payment Processing - Initiated',
  'Final Payment - Received and Confirmed',
  'Client Payment Disbursed',
  'Claim Completed - Record Archived',
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
      <div className="pb-2 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-950">Claim Type & Progress</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="block text-sm font-bold text-gray-950">Claim Type</label>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 shadow-2xs shrink-0"
              title="Compulsory field - Must fill in"
            >
              <span className="text-red-600 font-black text-xs leading-none">*</span> Must fill in
            </span>
          </div>
          <select
            {...register('claimType')}
            className="block w-full rounded-lg border border-gray-300 border-l-4 border-l-red-500 bg-white text-gray-950 font-semibold px-3 py-2.5 shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
          >
            <option value="Domestic">Domestic</option>
            <option value="Taxi">Taxi</option>
            <option value="PI">PI (Personal Injury)</option>
            <option value="PCO">PCO</option>
          </select>
          {errors.claimType && (
            <p className="mt-1 text-xs font-semibold text-red-600">⚠️ {errors.claimType.message as string}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="block text-sm font-bold text-gray-950">Claim Reason</label>
            <span
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300 shadow-2xs shrink-0"
              title="Compulsory - Select at least one"
            >
              <span className="text-red-600 font-black text-xs leading-none">*</span> Select min 1
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {CLAIM_REASONS.map((reason) => {
              const isChecked = Array.isArray(selectedReasons) ? selectedReasons.includes(reason.value) : false;
              return (
                <label
                  key={reason.value}
                  className={`inline-flex items-center px-3 py-2 rounded-lg border cursor-pointer select-none text-xs font-bold transition-all ${
                    isChecked
                      ? 'bg-primary/10 border-primary text-primary shadow-2xs'
                      : 'bg-white border-gray-300 text-gray-800 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleReasonChange(reason.value)}
                    className="rounded border-gray-300 text-primary focus:ring-primary mr-2 h-4 w-4"
                  />
                  <span>{reason.label}</span>
                </label>
              );
            })}
          </div>
          {errors.claimReason && (
            <p className="mt-1.5 text-xs font-semibold text-red-600">⚠️ {errors.claimReason.message as string}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label className="block text-sm font-bold text-gray-950">Case Progress</label>
          </div>
          <select
            {...register('caseProgress')}
            className="block w-full rounded-lg border border-gray-300 bg-white text-gray-950 font-semibold px-3 py-2.5 shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
          >
            <option value="Awaiting">Awaiting</option>
            <option value="Win">Win</option>
            <option value="Lost">Lost</option>
            <option value="50/50">50/50</option>
          </select>
          {errors.caseProgress && (
            <p className="mt-1 text-xs font-semibold text-red-600">⚠️ {errors.caseProgress.message as string}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClaimProgress;