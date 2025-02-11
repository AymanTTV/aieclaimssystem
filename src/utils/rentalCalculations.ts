import { addDays, differenceInDays, isAfter } from 'date-fns';
import { Vehicle, Rental } from '../types';

// Default rental rates (whole numbers)
export const RENTAL_RATES = {
  daily: 60,   // £60 per day
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
  negotiatedRate?: number
): number => {
  // Get vehicle-specific pricing or use defaults
  const dailyRate = negotiatedRate || vehicle?.dailyRentalPrice || RENTAL_RATES.daily;
  const weeklyRate = negotiatedRate || vehicle?.weeklyRentalPrice || RENTAL_RATES.weekly;
  const claimRate = negotiatedRate || vehicle?.claimRentalPrice || RENTAL_RATES.claim;

  // Special rates based on reason
  if (reason === 'staff') return 0; // Staff rentals are free
  if (reason === 'claim') return differenceInDays(endDate, startDate) * claimRate;

  // Calculate total days (including end date)
  const totalDays = differenceInDays(endDate, startDate) + 1;

  // For claim rentals
  if (type === 'claim') {
    return totalDays * claimRate;
  }

   if (type === 'weekly') {
    // Calculate total days between dates
    const totalDays = differenceInDays(endDate, startDate) + 1;
    // Calculate full weeks (rounding up)
    const weeks = Math.ceil(totalDays / 7);
    return weeks * weeklyRate;
  }

  // For daily rentals
  const weeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;

  if (weeks > 0) {
    // If remaining days cost more than a week, charge weekly rate
    if (remainingDays * dailyRate > weeklyRate) {
      return (weeks + 1) * weeklyRate;
    }
    return (weeks * weeklyRate) + (remainingDays * dailyRate);
  }

  return totalDays * dailyRate;
};

export const calculateOverdueCost = (
  rental: Rental,
  currentDate: Date,
  vehicle?: Vehicle
): number => {
  if (!isAfter(currentDate, rental.endDate)) return 0;

  const dailyRate = vehicle?.dailyRentalPrice || RENTAL_RATES.daily;
  const weeklyRate = vehicle?.weeklyRentalPrice || RENTAL_RATES.weekly;
  const claimRate = vehicle?.claimRentalPrice || RENTAL_RATES.claim;

  // Calculate overdue days including partial days
  const overdueDays = Math.ceil(
    (currentDate.getTime() - rental.endDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // For claim rentals, always use claim rate
  if (rental.type === 'claim' || rental.reason === 'claim') {
    return overdueDays * claimRate;
  }

  // For weekly rentals
  if (rental.type === 'weekly') {
    const overdueWeeks = Math.ceil(overdueDays / 7);
    return overdueWeeks * weeklyRate;
  }

  // For daily rentals
  const overdueWeeks = Math.floor(overdueDays / 7);
  const remainingDays = overdueDays % 7;

  if (remainingDays * dailyRate > weeklyRate) {
    return (overdueWeeks + 1) * weeklyRate;
  }

  return (overdueWeeks * weeklyRate) + (remainingDays * dailyRate);
};

export const calculateDiscount = (
  totalAmount: number,
  discountPercentage: number
): number => {
  if (discountPercentage <= 0 || discountPercentage > 100) return 0;
  return (totalAmount * discountPercentage) / 100;
};
