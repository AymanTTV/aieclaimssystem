// src/utils/rentalCalculations.ts
import { addDays, differenceInDays, isAfter, differenceInHours } from 'date-fns';
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

  // Insurance for daily/claim (per day)
  insurancePerDay?: number,

  // ✅ NEW: Insurance for weekly rentals (per week)
  insurancePerWeek?: number,

  includeVAT?: boolean, // New parameter for overall rental VAT
  deliveryChargeIncludeVAT?: boolean, // New parameter for delivery charge VAT
  collectionChargeIncludeVAT?: boolean, // New parameter for collection charge VAT
  insurancePerDayIncludeVAT?: boolean, // New parameter for insurance per day VAT

  // ✅ NEW: VAT toggle for weekly insurance
  insurancePerWeekIncludeVAT?: boolean,

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

  // --- MODIFIED: Switched to a more precise hour-based calculation ---
  // This correctly calculates the number of 24-hour periods to charge for.
  const totalHours = differenceInHours(endDate, startDate);
  // A rental for 0 or negative hours (e.g. 11:00 to 11:00) is charged as 1 day minimum.
  const totalDays = totalHours <= 0 ? 1 : Math.ceil(totalHours / 24);

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

  // ---> UPDATED: Calculate total insurance cost <---
  // Daily + Claim: insurance per day
  // Weekly: insurance per week
  const totalWeeks = Math.ceil(totalDays / 7);

  const insuranceCost =
    type === 'weekly'
      ? totalWeeks * (insurancePerWeek ?? 0)
      : totalDays * (insurancePerDay ?? 0);

  // Apply VAT to individual claim charges if the respective checkbox is ticked
  const deliveryChargeWithVAT = (deliveryCharge ?? 0) * (deliveryChargeIncludeVAT ? 1.2 : 1);
  const collectionChargeWithVAT = (collectionCharge ?? 0) * (collectionChargeIncludeVAT ? 1.2 : 1);

  // ✅ UPDATED: Insurance VAT depends on weekly vs daily/claim
  const insuranceCostWithVAT =
    type === 'weekly'
      ? insuranceCost * (insurancePerWeekIncludeVAT ? 1.2 : 1)
      : insuranceCost * (insurancePerDayIncludeVAT ? 1.2 : 1);

  const recoveryCostWithVAT = (recoveryCost ?? 0) * (includeRecoveryCostVAT ? 1.2 : 1); // NEW: Apply VAT to recovery cost

  // Note: Storage VAT is assumed to be handled before passing storageCost here based on existing code structure

  const totalAdditionalCostsWithVAT =
    (storageCost ?? 0) +
    recoveryCostWithVAT + // NEW: Use recoveryCostWithVAT
    deliveryChargeWithVAT +
    collectionChargeWithVAT +
    insuranceCostWithVAT;

  // --- FIX APPLIED HERE ---
  // Apply Hire VAT (includeVAT) ONLY to the baseCost
  const baseCostWithVAT = baseCost * (includeVAT ? 1.2 : 1);

  // Add the VAT-inclusive extras to the VAT-inclusive base cost
  const finalTotalCost = baseCostWithVAT + totalAdditionalCostsWithVAT;

  return parseFloat(finalTotalCost.toFixed(2));
};

export const calculateTotalSubstitutionCharges = (rental: Rental): number => {
  if (!rental.hireSubstitutionDetails) return 0;
  
  return rental.hireSubstitutionDetails.reduce((total, sub) => {
    return total + (sub.returnCondition?.totalCharges || 0);
  }, 0);
};

// utils/rentalCalculations.ts

export function calculateOverdueCost(
  rental: Rental,
  now: Date,
  vehicle?: Vehicle
): number {
  if (!rental || !rental.endDate) return 0;

  const end = new Date(rental.endDate);
  if (now <= end) return 0;

  // Effective base rate (negotiated > vehicle > default)
  const baseRateFromVehicle =
    rental.type === 'daily'
      ? vehicle?.dailyRentalPrice
      : rental.type === 'weekly'
      ? vehicle?.weeklyRentalPrice
      : vehicle?.claimRentalPrice;

  const defaultRate = (RENTAL_RATES as any)?.[rental.type] ?? 0;
  const rate = rental.negotiatedRate ?? baseRateFromVehicle ?? defaultRate;

  // Units overdue (round UP)
  const overdueHours = Math.max(0, differenceInHours(now, end));
  const overdueDays = Math.ceil(overdueHours / 24) || 1;

  const units =
    rental.type === 'weekly' ? Math.ceil(overdueDays / 7) : overdueDays;

  let cost = units * rate;

  // Make ongoing VAT behavior consistent with saved r.cost (which is VAT-inclusive)
  if (rental.includeVAT) {
    cost *= 1.2; // add VAT
  }

  return Math.max(0, cost);
}

// Optionally expose units for UI
export function getOverdueUnits(rental: Rental, now: Date): number {
  const end = new Date(rental.endDate);
  if (now <= end) return 0;
  const overdueHours = Math.max(0, differenceInHours(now, end));
  const overdueDays = Math.ceil(overdueHours / 24) || 1;
  return rental.type === 'weekly' ? Math.ceil(overdueDays / 7) : overdueDays;
}

export const calculateDiscount = (
  totalAmount: number,
  discountPercentage: number
): number => {
  if (discountPercentage <= 0 || discountPercentage > 100) return 0;
  // Ensure the final discount amount is rounded to 2 decimal places
  const calculated = (totalAmount * discountPercentage) / 100;
  return parseFloat(calculated.toFixed(2));
};