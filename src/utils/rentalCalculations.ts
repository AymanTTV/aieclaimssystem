
import { addDays, differenceInDays, isAfter } from 'date-fns';
import { Vehicle, Rental } from '../types'; // Assuming Rental is imported from '../types'

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
  negotiatedRate?: number,
  storageCost?: number, // Optional storage cost passed in
  recoveryCost?: number, // Optional recovery cost passed in
  // ---> NEW: Add parameters for new charges <---
  deliveryCharge?: number,
  collectionCharge?: number,
  insurancePerDay?: number
): number => {
  // ---> NEW: Handle free rentals for 'staff' and 'o/d' upfront <---
  if (reason === 'staff' || reason === 'o/d') return 0;

  // Ensure dates are valid before calculation
  if (!startDate || !endDate || isAfter(startDate, endDate)) {
     console.warn('Invalid start/end dates provided for rental cost calculation.');
     return 0; // Or throw an error, depending on desired handling
  }

  // Get vehicle-specific pricing or use defaults
  const dailyRate = negotiatedRate ?? vehicle?.dailyRentalPrice ?? RENTAL_RATES.daily;
  const weeklyRate = negotiatedRate ?? vehicle?.weeklyRentalPrice ?? RENTAL_RATES.weekly;
  const claimRate = negotiatedRate ?? vehicle?.claimRentalPrice ?? RENTAL_RATES.claim;

  let baseCost = 0; // Initialize baseCost

  // Calculate total days (including end date) - ensure dates are valid
  const totalDays = differenceInDays(endDate, startDate) + 1;

  // Calculate base cost based on rental type/reason
  if (type === 'claim' || reason === 'claim') { // Consolidated claim logic
    baseCost = totalDays * claimRate;
  } else if (type === 'weekly') {
    const weeks = Math.ceil(totalDays / 7);
    baseCost = weeks * weeklyRate;
  } else { // Daily type calculation
    const weeks = Math.floor(totalDays / 7);
    const remainingDays = totalDays % 7;
    const dailyTotalCost = remainingDays * dailyRate;

    // Check if charging remaining days individually is more expensive than a full week
    if (weeks > 0 && dailyTotalCost > weeklyRate) {
      baseCost = (weeks + 1) * weeklyRate; // Charge an extra week
    } else {
      baseCost = (weeks * weeklyRate) + dailyTotalCost; // Charge weeks + remaining days
    }
  }

  // ---> NEW: Calculate total insurance cost <---
  const insuranceCost = totalDays * (insurancePerDay ?? 0); // Default to 0 if undefined

  // ---> NEW: Add all additional costs (storage, recovery, delivery, collection, insurance) <---
  const totalAdditionalCosts = (storageCost ?? 0) +
                               (recoveryCost ?? 0) +
                               (deliveryCharge ?? 0) +
                               (collectionCharge ?? 0) +
                               insuranceCost;

  return baseCost + totalAdditionalCosts;
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