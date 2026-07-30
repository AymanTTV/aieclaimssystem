// src/utils/rentalCalculations.ts
import { differenceInHours, isAfter, isBefore } from 'date-fns';
import { Vehicle, Rental, RentalDiscount } from '../types'; 

export const RENTAL_RATES = {
  daily: 60,
  weekly: 360,
  claim: 340
} as const;

export type RentalType = keyof typeof RENTAL_RATES;
export type RentalReason = 'hired' | 'claim' | 'o/d' | 'staff' | 'workshop' | 'c-substitute' | 'h-substitute';

export interface DetailedRentalCost {
  baseNet: number;          // Original Total Net (Before Discount & Extra Charges)
  baseVat: number;          // Original VAT
  baseGross: number;        // Original Gross (Before Discount & Extra Charges)
  pureHireNet: number;      // NEW: The pure unadjusted base hire rate
  pureInsuranceNet: number; // NEW: The pure unadjusted insurance cost
  discountAmount: number;   // The Total NET Discount Amount
  net: number;              // Final Net (After Discount + Extra Charges)
  vat: number;              // Final VAT (Recalculated)
  gross: number;            // Final Gross
}

export const calculateRentalCostDetailed = (
  startDate: Date,
  endDate: Date,
  type: RentalType,
  vehicle?: Vehicle,
  reason?: RentalReason,
  negotiatedRate?: number,
  storageCost: number = 0,
  recoveryCost: number = 0,
  deliveryCharge: number = 0,
  collectionCharge: number = 0,
  insurancePerDay: number = 0,
  insurancePerWeek: number = 0,
  includeVAT: boolean = false,
  deliveryChargeIncludeVAT: boolean = false,
  collectionChargeIncludeVAT: boolean = false,
  insurancePerDayIncludeVAT: boolean = false,
  insurancePerWeekIncludeVAT: boolean = false,
  includeRecoveryCostVAT: boolean = false,
  includeStorageVAT: boolean = false,
  discountPercentage: number = 0,
  discountAmountInput: number = 0,
  rentalStatus?: string,
  lockedDailyRate?: number,
  lockedWeeklyRate?: number,
  lockedClaimRate?: number,
  extraChargesTotal: number = 0,
  discounts: RentalDiscount[] = [] // ✅ Discounts Array Passed Here
): DetailedRentalCost => {
  if (reason === 'staff' || reason === 'o/d') {
    return { baseNet: 0, baseVat: 0, baseGross: 0, pureHireNet: 0, pureInsuranceNet: 0, discountAmount: 0, net: extraChargesTotal, vat: 0, gross: extraChargesTotal };
  }

  const dailyRate = negotiatedRate ?? vehicle?.dailyRentalPrice ?? RENTAL_RATES.daily;
  const weeklyRate = negotiatedRate ?? vehicle?.weeklyRentalPrice ?? RENTAL_RATES.weekly;
  const claimRate = negotiatedRate ?? vehicle?.claimRentalPrice ?? RENTAL_RATES.claim;

  const pastDaily = lockedDailyRate ?? dailyRate;
  const pastWeekly = lockedWeeklyRate ?? weeklyRate;
  const pastClaim = lockedClaimRate ?? claimRate;

  let baseNet = 0;
  const now = new Date();
  
  const totalHours = differenceInHours(endDate, startDate);
  const totalDays = totalHours <= 0 ? 1 : Math.ceil(totalHours / 24);

  if (rentalStatus === 'active' && !negotiatedRate) {
     if (isAfter(now, startDate) && isBefore(now, endDate)) {
         const pastHours = differenceInHours(now, startDate);
         const pastDays = Math.max(0, Math.floor(pastHours / 24));
         const futureDays = Math.max(0, totalDays - pastDays);

         if (type === 'claim' || reason === 'claim') baseNet = (pastDays * pastClaim) + (futureDays * claimRate);
         else if (type === 'weekly') {
             const pastWeeks = Math.max(0, Math.floor(pastDays / 7));
             const totalWeeks = Math.ceil(totalDays / 7);
             const futureWeeks = Math.max(0, totalWeeks - pastWeeks);
             baseNet = (pastWeeks * pastWeekly) + (futureWeeks * weeklyRate);
         } else baseNet = (pastDays * pastDaily) + (futureDays * dailyRate);
     } else {
         if (isAfter(now, endDate)) {
            if (type === 'claim' || reason === 'claim') baseNet = totalDays * pastClaim;
            else if (type === 'weekly') baseNet = Math.ceil(totalDays / 7) * pastWeekly;
            else baseNet = totalDays * pastDaily;
         } else {
            if (type === 'claim' || reason === 'claim') baseNet = totalDays * claimRate;
            else if (type === 'weekly') baseNet = Math.ceil(totalDays / 7) * weeklyRate;
            else baseNet = totalDays * dailyRate;
         }
     }
  } else {
      const activeD = (rentalStatus === 'completed' || rentalStatus === 'cancelled') ? pastDaily : dailyRate;
      const activeW = (rentalStatus === 'completed' || rentalStatus === 'cancelled') ? pastWeekly : weeklyRate;
      const activeC = (rentalStatus === 'completed' || rentalStatus === 'cancelled') ? pastClaim : claimRate;
      
      if (type === 'claim' || reason === 'claim') baseNet = totalDays * activeC;
      else if (type === 'weekly') baseNet = Math.ceil(totalDays / 7) * activeW;
      else baseNet = totalDays * activeD;
  }

  const totalWeeks = Math.ceil(totalDays / 7);
  const insuranceCostNet = type === 'weekly' ? totalWeeks * insurancePerWeek : totalDays * insurancePerDay;
  
  // --- REVISED LOGIC START ---
  
  // 1. Process explicit line-item discounts or legacy input
  let baseDiscountAmt = 0;
  let insuranceDiscountAmt = 0;

  if (discounts && discounts.length > 0) {
    discounts.forEach(d => {
      if (d.applyTo === 'insurance') {
        insuranceDiscountAmt += d.amount;
      } else {
        baseDiscountAmt += d.amount;
      }
    });
  } else {
    // Legacy fallback behavior
    if (discountAmountInput > 0) {
      baseDiscountAmt = discountAmountInput; 
    } else if (discountPercentage > 0) {
      baseDiscountAmt = baseNet * (discountPercentage / 100);
    }
  }
  
  // Prevent discounts from being higher than their specific line items
  baseDiscountAmt = Math.min(baseDiscountAmt, baseNet);
  insuranceDiscountAmt = Math.min(insuranceDiscountAmt, insuranceCostNet);

  const discountedBaseNet = baseNet - baseDiscountAmt;
  const discountedInsuranceNet = insuranceCostNet - insuranceDiscountAmt;
  const totalDiscountAmtNet = baseDiscountAmt + insuranceDiscountAmt;

  // 2. Calculate Final VAT
  // Base VAT and Insurance VAT scale with their respective discounted lines.
  let finalVat = 0;
  if (includeVAT) finalVat += discountedBaseNet * 0.20;
  if (includeStorageVAT) finalVat += storageCost * 0.20;
  if (includeRecoveryCostVAT) finalVat += recoveryCost * 0.20;
  if (deliveryChargeIncludeVAT) finalVat += deliveryCharge * 0.20;
  if (collectionChargeIncludeVAT) finalVat += collectionCharge * 0.20;
  if (type === 'weekly' && insurancePerWeekIncludeVAT) finalVat += discountedInsuranceNet * 0.20;
  else if (type !== 'weekly' && insurancePerDayIncludeVAT) finalVat += discountedInsuranceNet * 0.20;

  // 3. Track Original Totals (so the UI correctly displays the 'Before Discount' gross breakdown)
  const originalTotalNet = baseNet + storageCost + recoveryCost + deliveryCharge + collectionCharge + insuranceCostNet;
  
  let originalVatAccumulator = 0;
  if (includeVAT) originalVatAccumulator += baseNet * 0.20;
  if (includeStorageVAT) originalVatAccumulator += storageCost * 0.20;
  if (includeRecoveryCostVAT) originalVatAccumulator += recoveryCost * 0.20;
  if (deliveryChargeIncludeVAT) originalVatAccumulator += deliveryCharge * 0.20;
  if (collectionChargeIncludeVAT) originalVatAccumulator += collectionCharge * 0.20;
  if (type === 'weekly' && insurancePerWeekIncludeVAT) originalVatAccumulator += insuranceCostNet * 0.20;
  else if (type !== 'weekly' && insurancePerDayIncludeVAT) originalVatAccumulator += insuranceCostNet * 0.20;

  // 4. Calculate Final Net & Gross
  const finalNet = discountedBaseNet + storageCost + recoveryCost + deliveryCharge + collectionCharge + discountedInsuranceNet + extraChargesTotal;
  const finalGross = finalNet + finalVat;

  return {
    baseNet: originalTotalNet,
    baseVat: originalVatAccumulator,
    baseGross: originalTotalNet + originalVatAccumulator,
    pureHireNet: baseNet,
    pureInsuranceNet: insuranceCostNet,
    discountAmount: totalDiscountAmtNet, 
    net: finalNet,
    vat: finalVat,
    gross: finalGross
  };
};

// Legacy Wrapper for older components
export const calculateRentalCost = (
  startDate: Date, endDate: Date, type: RentalType, vehicle?: Vehicle, reason?: RentalReason,
  negotiatedRate?: number, storageCost?: number, recoveryCost?: number, deliveryCharge?: number,
  collectionCharge?: number, insurancePerDay?: number, insurancePerWeek?: number,
  includeVAT?: boolean, deliveryChargeIncludeVAT?: boolean, collectionChargeIncludeVAT?: boolean,
  insurancePerDayIncludeVAT?: boolean, insurancePerWeekIncludeVAT?: boolean, includeRecoveryCostVAT?: boolean,
  includeStorageVAT?: boolean, rentalStatus?: string, lockedDailyRate?: number, lockedWeeklyRate?: number, lockedClaimRate?: number,
  extraChargesTotal?: number
): number => {
  const detailed = calculateRentalCostDetailed(
    startDate, endDate, type, vehicle, reason, negotiatedRate,
    storageCost || 0, recoveryCost || 0, deliveryCharge || 0, collectionCharge || 0,
    insurancePerDay || 0, insurancePerWeek || 0, includeVAT || false,
    deliveryChargeIncludeVAT || false, collectionChargeIncludeVAT || false,
    insurancePerDayIncludeVAT || false, insurancePerWeekIncludeVAT || false,
    includeRecoveryCostVAT || false, includeStorageVAT || false,
    0, 0, rentalStatus, lockedDailyRate, lockedWeeklyRate, lockedClaimRate, extraChargesTotal || 0,
    []
  );
  return detailed.gross;
};

export const calculateTotalSubstitutionCharges = (rental: Rental): number => {
  if (!rental.hireSubstitutionDetails) return 0;
  return rental.hireSubstitutionDetails.reduce((total, sub) => total + (sub.returnCondition?.totalCharges || 0), 0);
};

export function getOverdueUnits(rental: Rental, now: Date): number {
  const end = new Date(rental.endDate);
  if (now <= end) return 0;
  const overdueHours = Math.max(0, differenceInHours(now, end));
  const overdueDays = Math.ceil(overdueHours / 24) || 1;
  return rental.type === 'weekly' ? Math.ceil(overdueDays / 7) : overdueDays;
}

export const calculateOverdueCost = (rental: Rental, now: Date, vehicle?: Vehicle): number => {
  const end = new Date(rental.endDate);
  if (now <= end) return 0;
  const dailyRate = rental.negotiatedRate ?? vehicle?.dailyRentalPrice ?? RENTAL_RATES.daily;
  const weeklyRate = rental.negotiatedRate ?? vehicle?.weeklyRentalPrice ?? RENTAL_RATES.weekly;
  const claimRate = rental.negotiatedRate ?? vehicle?.claimRentalPrice ?? RENTAL_RATES.claim;
  const units = getOverdueUnits(rental, now);
  let rate = rental.type === 'claim' || rental.reason === 'claim' ? claimRate : rental.type === 'weekly' ? weeklyRate : dailyRate;
  let cost = units * rate;
  if (rental.includeVAT) cost *= 1.2;
  return Math.max(0, cost);
};

export const calculateDiscount = (totalAmount: number, discountPercentage: number): number => {
  if (!totalAmount || !discountPercentage) return 0;
  return (totalAmount * discountPercentage) / 100;
};