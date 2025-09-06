// src/utils/claimProgress.ts

import type { Claim } from '../types/claim';

/**
 * Single source of truth for new (current) progress options.
 * Keep this in sync with your intended "v2" statuses.
 */
export const PROGRESS_OPTIONS = [
  'Your Claim Has Started',
  'Client Contacted for Initial Statement',
  'Accident Details Verified',
  'Report to Legal Team - Pending',
  'Legal Team Reviewing Claim',
  'Client Documentation - Pending Submission',
  'Additional Information - Requested from Client',
  'Client Failed to Respond',
  'TPI (Third Party Insurer) - Notified and Awaiting Response',
  'TPI Acknowledged Notification',
  'TPI Refuses to Deal with Claim',
  'TPI Accepted Liability',
  'TPI Rejected Liability',
  'TPI Liability - 50/50 Split Under Review',
  'TPI Liability - 50/50 Split Agreed',
  'Liability Accepted',
  'Liability Disputed',
  'Liability Disputed - Under Legal Review',
  'Liability Disputed - Witness Statement Requested',
  'Liability Disputed - Expert Report Required',
  'Liability Disputed - Negotiation Ongoing',
  'Liability Disputed - No Agreement Reached',
  'Liability Disputed - Referred to Court',
  'Engineer Assigned',
  'Engineer Report - Pending Completion',
  'Engineer Report - Completed',
  'Vehicle Damage Assessment - Scheduled',
  'Vehicle Damage Assessment - TPI Scheduled',
  'Vehicle Inspection - Completed',
  'Repair Authorisation - Awaiting Approval',
  'Repair in Progress',
  'Vehicle Repair - Completed',
  'Total Loss - Awaiting Valuation',
  'Total Loss Offer - Made',
  'Total Loss Offer - Accepted',
  'Total Loss Offer - Disputed',
  'Salvage Collected',
  'Salvage Payment Received',
  'Hire Vehicle - Arranged',
  'Hire Period - Ongoing',
  'Hire Vehicle - Off-Hired',
  'Hire Invoice - Generated',
  'Hire Pack - Successfully Submitted',
  'VD Completed Hire Pack - Awaiting Review',
  'TPI made VD offer - Ongoing',
  'VD Negotiation with TPI - Ongoing',
  'VD payment Received - Prejudice basis',
  'VD payment Received - with VAT',
  'VD payment Received - Without VAT',
  'PI Medical Report - Requested',
  'PI Medical Report - Received',
  'PI Negotiation with TPI - Ongoing',
  'Settlement Offer - Under Review',
  'Client Approval - Pending for Settlement',
  'Client Rejected Offer',
  'Settlement Agreement - Finalized',
  'Legal Notice - Issued to Third Party',
  'Court Proceedings - Initiated',
  'Court Hearing - Awaiting Date',
  'Court Hearing - Completed',
  'MIB Claim - Initial Review in Progress',
  'MIB Claim - Under Review/In Progress',
  'Awaiting MIB Response/Decision',
  'MIB Offer - Received and Under Review',
  'MIB Offer - Accepted',
  'MIB Offer - Rejected',
  'Claim in Progress',
  'Claim Complete'
] as const;

export const PROGRESS_SET = new Set(PROGRESS_OPTIONS);

/**
 * A claim is legacy if its `progress` or any history item
 * holds a status that is NOT in the current progress set.
 */
export function isLegacyClaimProgress(claim: Pick<Claim, 'progress' | 'progressHistory'>): boolean {
  const p = (claim.progress ?? '') as string;
  if (p && !PROGRESS_SET.has(p)) return true;

  const hist = claim.progressHistory || [];
  for (const h of hist) {
    if (h?.status && !PROGRESS_SET.has(h.status)) return true;
  }
  return false;
}

/**
 * For display purposes: current status = claim.progress,
 * but if legacy OR missing, derive from the latest history entry.
 */
export function deriveDisplayStatus(claim: Pick<Claim, 'progress' | 'progressHistory'>): string | null {
  const isLegacy = isLegacyClaimProgress(claim);
  if (!isLegacy && claim.progress) return claim.progress as string;

  const hist = [...(claim.progressHistory || [])].sort(
    (a, b) => (new Date(b.date).getTime()) - (new Date(a.date).getTime())
  );
  return hist[0]?.status ?? (claim.progress as string) ?? null;
}
