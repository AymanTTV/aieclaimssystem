import { differenceInDays } from 'date-fns';

export const RENTAL_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  CLAIM: 'claim'
} as const;

export const RENTAL_RATES = {
  daily: 60, // £60 per day
  weekly: 360, // £360 per week
  claim: 340, // £340 per day for claim rentals
  staff: 30, // £30 per day for staff
  workshop: 0, // Free for workshop
  substitute: 45 // £45 per day for substitutes
} as const;

export const calculateRentalCost = (
  startDate: Date,
  endDate: Date,
  type: keyof typeof RENTAL_TYPES,
  reason?: string
): number => {
  const days = differenceInDays(endDate, startDate) + 1;

  // Special rates based on reason
  if (reason === 'staff') return days * RENTAL_RATES.staff;
  if (reason === 'workshop') return 0;
  if (reason === 'wfw-c-substitute' || reason === 'h-substitute') {
    return days * RENTAL_RATES.substitute;
  }

  // Standard rates based on type
  if (type === RENTAL_TYPES.WEEKLY) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return (weeks * RENTAL_RATES.weekly) + (remainingDays * RENTAL_RATES.daily);
  }

  if (type === RENTAL_TYPES.CLAIM) {
    return days * RENTAL_RATES.claim;
  }

  return days * RENTAL_RATES.daily;
};