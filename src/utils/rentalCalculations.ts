import { addWeeks, differenceInDays } from 'date-fns';

// Rental rate constants
export const RENTAL_RATES = {
  daily: 60,    // £60 per day
  weekly: 360,  // £360 per week
  claim: 340    // £340 per day for claim rentals
} as const;

export type RentalType = keyof typeof RENTAL_RATES;
export type RentalReason = 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop' | 'c-substitute' | 'h-substitute';

/**
 * Calculate rental cost based on type and duration
 */
export const calculateRentalCost = (
  startDate: Date,
  endDate: Date,
  type: RentalType,
  reason?: RentalReason,
  numberOfWeeks?: number
): number => {
  // Special rates based on reason
  if (reason === 'staff') return 30;
  if (reason === 'workshop') return 0;
  if (reason === 'c-substitute' || reason === 'h-substitute') return 45;

  const days = Math.max(1, differenceInDays(endDate, startDate));

  switch (type) {
    case 'weekly':
      return (numberOfWeeks || 1) * RENTAL_RATES.weekly;
    case 'claim':
      return days * RENTAL_RATES.claim;
    case 'daily':
    default:
      return days * RENTAL_RATES.daily;
  }
};

/**
 * Calculate end date for weekly rentals
 */
export const calculateWeeklyEndDate = (startDate: Date, numberOfWeeks: number): Date => {
  return addWeeks(startDate, numberOfWeeks);
};

/**
 * Calculate final cost considering negotiated rate
 */
export const calculateFinalCost = (
  standardCost: number,
  negotiatedRate?: string | null
): number => {
  if (!negotiatedRate) return standardCost;
  const negotiatedAmount = parseFloat(negotiatedRate);
  return negotiatedAmount > 0 ? negotiatedAmount : standardCost;
};

/**
 * Calculate remaining amount after payment
 */
export const calculateRemainingAmount = (
  totalCost: number,
  paidAmount: number,
  negotiatedRate?: string | null
): number => {
  const finalCost = calculateFinalCost(totalCost, negotiatedRate);
  return Math.max(0, finalCost - paidAmount);
};

/**
 * Get payment status based on amounts
 */
export const getPaymentStatus = (
  totalCost: number,
  paidAmount: number,
  negotiatedRate?: string | null
): 'paid' | 'partially_paid' | 'pending' => {
  const finalCost = calculateFinalCost(totalCost, negotiatedRate);
  if (paidAmount >= finalCost) return 'paid';
  if (paidAmount > 0) return 'partially_paid';
  return 'pending';
};
