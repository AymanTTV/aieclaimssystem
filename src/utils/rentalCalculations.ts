// rentalCalculations.ts
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
  insurancePerDay?: number,
  includeVAT?: boolean, // New parameter for overall rental VAT
  deliveryChargeIncludeVAT?: boolean, // New parameter for delivery charge VAT
  collectionChargeIncludeVAT?: boolean, // New parameter for collection charge VAT
  insurancePerDayIncludeVAT?: boolean, // New parameter for insurance per day VAT
  includeRecoveryCostVAT?: boolean // NEW: Add parameter for Recovery Cost VAT
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

  // Apply VAT to individual claim charges if the respective checkbox is ticked
  const deliveryChargeWithVAT = (deliveryCharge ?? 0) * (deliveryChargeIncludeVAT ? 1.2 : 1);
  const collectionChargeWithVAT = (collectionCharge ?? 0) * (collectionChargeIncludeVAT ? 1.2 : 1);
  const insuranceCostWithVAT = insuranceCost * (insurancePerDayIncludeVAT ? 1.2 : 1);
  const recoveryCostWithVAT = (recoveryCost ?? 0) * (includeRecoveryCostVAT ? 1.2 : 1); // NEW: Apply VAT to recovery cost

  // Note: Storage VAT is assumed to be handled before passing storageCost here based on existing code structure

  const totalAdditionalCostsWithVAT = (storageCost ?? 0) +
                               recoveryCostWithVAT + // NEW: Use recoveryCostWithVAT
                               deliveryChargeWithVAT +
                               collectionChargeWithVAT +
                               insuranceCostWithVAT;

  const totalCostBeforeOverallVAT = baseCost + totalAdditionalCostsWithVAT;

  // Apply overall rental VAT
  return parseFloat((totalCostBeforeOverallVAT * (includeVAT ? 1.2 : 1)).toFixed(2));
};

export const calculateOverdueCost = (
  rental: Rental,
  currentDate: Date,
  vehicle?: Vehicle
): number => {
  if (!isAfter(currentDate, rental.endDate)) return 0;

  // --- NEW GUARD: if negotiatedRate is explicitly zero, return 0 immediately ---
  if (rental.negotiatedRate === 0) {
    return 0;
  }

  // --- existing logic follows ---
  const dailyRate = (rental.negotiatedRate ?? vehicle?.dailyRentalPrice) || RENTAL_RATES.daily;
  const weeklyRate = (rental.negotiatedRate ?? vehicle?.weeklyRentalPrice) || RENTAL_RATES.weekly;
  const claimRate = (rental.negotiatedRate ?? vehicle?.claimRentalPrice) || RENTAL_RATES.claim;

  const overdueDays = Math.ceil(
    (currentDate.getTime() - rental.endDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (rental.type === 'claim' || rental.reason === 'claim') {
    return parseFloat((overdueDays * claimRate * (rental.includeVAT ? 1.2 : 1)).toFixed(2));
  }

  if (rental.type === 'weekly') {
    const overdueWeeks = Math.ceil(overdueDays / 7);
    return parseFloat((overdueWeeks * weeklyRate * (rental.includeVAT ? 1.2 : 1)).toFixed(2));
  }

  const overdueWeeks = Math.floor(overdueDays / 7);
  const remainingDays = overdueDays % 7;
  let overdueBaseCost = (overdueWeeks * weeklyRate) + (remainingDays * dailyRate);

  if (overdueWeeks === 0 && remainingDays > 0 && remainingDays * dailyRate > weeklyRate) {
    overdueBaseCost = weeklyRate;
  } else if (overdueWeeks > 0 && remainingDays > 0 && remainingDays * dailyRate > weeklyRate) {
    overdueBaseCost = (overdueWeeks + 1) * weeklyRate;
  }

  return parseFloat((overdueBaseCost * (rental.includeVAT ? 1.2 : 1)).toFixed(2));
};



export const calculateDiscount = (
  totalAmount: number,
  discountPercentage: number
): number => {
  if (discountPercentage <= 0 || discountPercentage > 100) return 0;
  // Ensure the final discount amount is rounded to 2 decimal places
  const calculated = (totalAmount * discountPercentage) / 100;
  return parseFloat(calculated.toFixed(2));
};