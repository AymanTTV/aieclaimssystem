import { addDays, addWeeks, differenceInDays } from 'date-fns';
import { Vehicle, Rental } from '../types';

// Default rental rates (whole numbers)
export const RENTAL_RATES = {
  daily: 60,  // £60 per day
  weekly: 360, // £360 per week
  claim: 340   // £340 per day for claim rentals
} as const;

export type RentalType = keyof typeof RENTAL_RATES;
export type RentalReason = 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop' | 'c-substitute' | 'h-substitute';

export const calculateRentalCost = (
  startDate: Date,
  endDate: Date,
  type: RentalType,
  vehicle?: Vehicle,
  reason?: RentalReason,
): number => {
  // Get vehicle-specific pricing or use defaults
  const dailyRate = vehicle?.dailyRentalPrice || RENTAL_RATES.daily;
  const weeklyRate = vehicle?.weeklyRentalPrice || RENTAL_RATES.weekly;
  const claimRate = vehicle?.claimRentalPrice || RENTAL_RATES.claim;

  // Special rates based on reason
  if (reason === 'staff') return 0; // Staff rentals are free

  // Calculate total days
  const totalDays = Math.max(1, differenceInDays(endDate, startDate));

  // For claim rentals
  if (type === 'claim') {
    if (totalDays > 90) {
      throw new Error('Claim rentals cannot exceed 90 days');
    }
    return totalDays * claimRate;
  }

  // For weekly rentals
  if (type === 'weekly') {
    const weeks = Math.floor(totalDays / 7);
    const extraDays = totalDays % 7;

    // If extra days are 5 or more, charge full week
    if (extraDays >= 5) {
      return (weeks + 1) * weeklyRate;
    }

    // Otherwise charge weekly rate plus daily rate for extra days
    return (weeks * weeklyRate) + (extraDays * dailyRate);
  }

  // For daily rentals
  if (totalDays >= 7) {
    const weeks = Math.floor(totalDays / 7);
    const extraDays = totalDays % 7;

    // If extra days are 5 or more, charge additional week
    if (extraDays >= 5) {
      return (weeks + 1) * weeklyRate;
    }

    // Otherwise charge weekly rate for complete weeks and daily rate for remaining days
    return (weeks * weeklyRate) + (extraDays * dailyRate);
  }

  // Less than 7 days - charge daily rate
  return totalDays * dailyRate;
};

export const calculateOverdueCost = (
  rental: Rental,
  currentDate: Date,
  vehicle?: Vehicle
): number => {
  const dailyRate = vehicle?.dailyRentalPrice || RENTAL_RATES.daily;
  const weeklyRate = vehicle?.weeklyRentalPrice || RENTAL_RATES.weekly;
  const claimRate = vehicle?.claimRentalPrice || RENTAL_RATES.claim;

  const extraDays = differenceInDays(currentDate, rental.endDate);
  if (extraDays <= 0) return 0;

  // For claim rentals, always use claim rate
  if (rental.type === 'claim') {
    return extraDays * claimRate;
  }

  // For weekly rentals
  if (rental.type === 'weekly') {
    const weeks = Math.floor(extraDays / 7);
    const remainingDays = extraDays % 7;

    // If remaining days are 5 or more, charge full week
    if (remainingDays >= 5) {
      return (weeks + 1) * weeklyRate;
    }

    // Otherwise charge weekly rate plus daily rate for remaining days
    return (weeks * weeklyRate) + (remainingDays * dailyRate);
  }

  // For daily rentals
  if (extraDays >= 7) {
    const weeks = Math.floor(extraDays / 7);
    const remainingDays = extraDays % 7;

    // If remaining days are 5 or more, charge additional week
    if (remainingDays >= 5) {
      return (weeks + 1) * weeklyRate;
    }

    // Otherwise charge weekly rate for complete weeks and daily rate for remaining days
    return (weeks * weeklyRate) + (remainingDays * dailyRate);
  }

  // Less than 7 days overdue - charge daily rate
  return extraDays * dailyRate;
};