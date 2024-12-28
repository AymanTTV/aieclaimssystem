// Rental rates in GBP
export const RENTAL_RATES = {
  daily: 60,    // £60 per day
  weekly: 360,  // £360 per week
  claim: 340    // £340 per day for claim rentals
} as const;

export type RentalType = keyof typeof RENTAL_RATES;

export type RentalReason = 
  | 'hired' 
  | 'claim' 
  | 'o/d' 
  | 'staff' 
  | 'workshop' 
  | 'c-substitute' 
  | 'h-substitute';

export type RentalStatus = 
  | 'urgent'
  | 'awaiting'
  | 'levc-loan'
  | 'completed';

/**
 * Calculate the total rental cost based on type and duration
 */
export const calculateRentalCost = (
  startDate: Date,
  endDate: Date,
  type: RentalType,
  reason?: RentalReason
): number => {
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Special rates based on reason
  if (reason === 'staff') return days * 30; // £30 per day
  if (reason === 'workshop') return 0; // Free
  if (reason === 'wfw-c-substitute' || reason === 'h-substitute') {
    return days * 45; // £45 per day
  }

  switch (type) {
    case 'weekly':
      const weeks = Math.ceil(days / 7);
      return weeks * RENTAL_RATES.weekly;
    case 'claim':
      return days * RENTAL_RATES.claim;
    case 'daily':
    default:
      return days * RENTAL_RATES.daily;
  }
};

/**
 * Validate if a rental period is valid
 */
export const isValidRentalPeriod = (startDate: Date, endDate: Date): boolean => {
  return startDate <= endDate && startDate >= new Date();
};