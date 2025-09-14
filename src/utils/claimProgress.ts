// src/utils/claimProgress.ts
import { Claim } from '../types';
import { ClaimProgress } from '../types/claim';

// This is the full list of standard progress options from your Claims.tsx file
export const PROGRESS_OPTIONS: ClaimProgress[] = [
    'Your Claim Has Started', 'Client Contacted for Initial Statement', 'Accident Details Verified',
    'Report to Legal Team - Pending', 'Legal Team Reviewing Claim', 'Client Documentation - Pending Submission',
    'Additional Information - Requested from Client', 'Client Failed to Respond', 'TPI (Third Party Insurer) - Notified and Awaiting Response',
    'TPI Acknowledged Notification', 'TPI Refuses to Deal with Claim', 'TPI Accepted Liability',
    'TPI Rejected Liability', 'TPI Liability - 50/50 Split Under Review', 'TPI Liability - 50/50 Split Agreed',
    'TPI Liability - Partial Split Under Review', 'TPI Liability - Partial Split (Other Ratio Agreed)',
    'Liability Disputed - Awaiting Evidence from Client', 'Liability Disputed - TPI Provided Counter Evidence',
    'Liability Disputed - Under Legal Review', 'Liability Disputed - Witness Statement Requested',
    'Liability Disputed - Expert Report Required', 'Liability Disputed - Negotiation Ongoing',
    'Liability Disputed - No Agreement Reached', 'Liability Disputed - Referred to Court', 'Engineer Assigned',
    'Engineer Report - Pending Completion', 'Engineer Report - Completed', 'Vehicle Damage Assessment - TPI Scheduled',
    'Vehicle Inspection - Completed', 'Repair Authorisation - Awaiting Approval', 'Repair in Progress',
    'Vehicle Repair - Completed', 'Total Loss - Awaiting Valuation', 'Total Loss Offer - Made',
    'Total Loss Offer - Accepted', 'Total Loss Offer - Disputed', 'Salvage Collected',
    'Salvage Payment Received', 'Hire Vehicle - Arranged', 'Hire Period - Ongoing',
    'Hire Vehicle - Off-Hired', 'Hire Invoice - Generated', 'Hire Pack - Successfully Submitted',
    'VD Completed Hire Pack - Awaiting Review', 'TPI made VD offer - Ongoing', 'VD Negotiation with TPI - Ongoing',
    'VD payment Received - Prejudice basis', 'VD payment Received - with VAT', 'VD payment Received - Without VAT',
    'PI Medical Report - Requested', 'PI Medical Report - Received', 'PI Negotiation with TPI - Ongoing',
    'Settlement Offer - Under Review', 'Client Approval - Pending for Settlement', 'Client Rejected Offer',
    'Settlement Agreement - Finalized', 'Legal Notice - Issued to Third Party', 'Court Proceedings - Initiated',
    'Court Hearing - Awaiting Date', 'Court Hearing - Completed', 'Judgement in Favour',
    'Judgement Against', 'Claim - Referred to MIB (Motor Insurers\' Bureau)', 'MIB Claim - Initial Review in Progress',
    'MIB Claim - Under Review/In Progress', 'Awaiting MIB Response/Decision', 'MIB - Completed (Outcome Received)',
    'Payment Processing - Initiated', 'Final Payment - Received and Confirmed', 'Client Payment Disbursed',
    'Claim Withdrawn by Client', 'Claim Rejected - Insufficient Evidence', 'Claim Suspended - Pending Client Action',
    'Claim Completed - Record Archived'
];


/**
 * Determines if a claim is using a legacy progress system.
 * A claim is considered legacy if its `progressHistory` has entries with statuses
 * that are not part of the standard PROGRESS_OPTIONS list.
 */
export const isLegacyClaimProgress = (claim: Claim): boolean => {
  if (claim.progressHistory && claim.progressHistory.length > 0) {
    // Check if any history status is a non-standard string
    return claim.progressHistory.some(h => !PROGRESS_OPTIONS.includes(h.status as ClaimProgress));
  }
  return false;
};

/**
 * Derives the most accurate status to display for a claim.
 * It prioritizes the latest status from the history. If no history exists,
 * it falls back to the top-level `progress` field.
 */
export const deriveDisplayStatus = (claim: Claim): string => {
  const hasHistory = claim.progressHistory && claim.progressHistory.length > 0;

  if (hasHistory) {
    // The source of truth is the latest history entry.
    // We sort by date descending to find the most recent status.
    const sortedHistory = [...claim.progressHistory].sort((a, b) => {
      // Ensure we are comparing valid Date objects
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    return sortedHistory[0].status;
  }
  
  // Fallback for claims with no history
  return claim.progress;
};