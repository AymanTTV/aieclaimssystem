import { addWeeks } from 'date-fns';

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

/**
 * Calculate the total rental cost based on type and duration
 */
export const calculateRentalCost = (
  startDate: Date,
  endDate: Date,
  type: RentalType,
  reason?: RentalReason,
  numberOfWeeks?: number
): number => {
  // Special rates based on reason
  if (reason === 'staff') return 30; // £30 per day
  if (reason === 'workshop') return 0; // Free
  if (reason === 'c-substitute' || reason === 'h-substitute') {
    return 45; // £45 per day
  }

  switch (type) {
    case 'weekly':
      return (numberOfWeeks || 1) * RENTAL_RATES.weekly;
    case 'claim':
      return RENTAL_RATES.claim;
    case 'daily':
    default:
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      return days * RENTAL_RATES.daily;
  }
};

/**
 * Calculate end date for weekly rentals
 */
export const calculateWeeklyEndDate = (startDate: Date, numberOfWeeks: number): Date => {
  return addWeeks(startDate, numberOfWeeks);
};