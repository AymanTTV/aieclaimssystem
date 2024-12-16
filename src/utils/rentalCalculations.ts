import { differenceInDays } from 'date-fns';

export const RENTAL_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  CLAIM: 'claim'
} as const;

export const RENTAL_RATES = {
  [RENTAL_TYPES.DAILY]: 60, // £60 per day
  [RENTAL_TYPES.WEEKLY]: 360, // £360 per week
  [RENTAL_TYPES.CLAIM]: 340 // £350 per day + £10 insurance
} as const;

export const calculateRentalCost = (
  startDate: Date,
  endDate: Date,
  type: keyof typeof RENTAL_TYPES,
  customRate?: number
): number => {
  const days = differenceInDays(endDate, startDate) + 1; // Include both start and end days

  // If custom rate is provided, use it
  if (customRate !== undefined) {
    return days * customRate;
  }

  // For weekly rentals, check if duration is less than a week
  if (type === RENTAL_TYPES.WEEKLY) {
    if (days < 7) {
      // Convert to daily rate if less than a week
      return days * RENTAL_RATES[RENTAL_TYPES.DAILY];
    }
    // Calculate full weeks and remaining days
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return (weeks * RENTAL_RATES[RENTAL_TYPES.WEEKLY]) + 
           (remainingDays * RENTAL_RATES[RENTAL_TYPES.DAILY]);
  }

  // For claim rentals, add insurance cost
  if (type === RENTAL_TYPES.CLAIM) {
    return days * (RENTAL_RATES[RENTAL_TYPES.CLAIM] + 10); // Daily rate + insurance
  }

  // Default daily rate
  return days * RENTAL_RATES[RENTAL_TYPES.DAILY];
};

export const calculateProRatedCost = (
  startDate: Date,
  endDate: Date,
  type: keyof typeof RENTAL_TYPES,
  returnedEarly: boolean
): number => {
  if (!returnedEarly) return calculateRentalCost(startDate, endDate, type);

  const actualDays = differenceInDays(endDate, startDate) + 1;
  
  // If it was a weekly rental but returned within 4 days, charge daily rate
  if (type === RENTAL_TYPES.WEEKLY && actualDays <= 4) {
    return actualDays * RENTAL_RATES[RENTAL_TYPES.DAILY];
  }

  return calculateRentalCost(startDate, endDate, type);
};