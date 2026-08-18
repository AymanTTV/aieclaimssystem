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
  baseNet: number;
  baseVat: number;
  baseGross: number;
  pureHireNet: number;
  pureInsuranceNet: number;
  discountAmount: number;
  net: number;
  vat: number;
  gross: number;
}

// ✅ UPGRADED: Hybrid Unit Calculator with Monday 12:00 PM resets AND 5-day week-rollover fix
export const getWeeklyHybridUnits = (startDate: Date, endDate: Date) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { dailyDays: 0, weeklyWeeks: 0 };
  if (start.getTime() >= end.getTime()) return { dailyDays: 1, weeklyWeeks: 0 };

  const getNextMondayNoon = (d: Date) => {
    const res = new Date(d);
    const day = res.getDay();
    const hours = res.getHours();

    // If it is already exactly Monday 12:00:00 PM, return as-is
    if (day === 1 && hours === 12 && res.getMinutes() === 0 && res.getSeconds() === 0 && res.getMilliseconds() === 0) {
      return res;
    }

    // Determine days until the next Monday
    let daysToMonday = (1 + 7 - day) % 7;
    
    // If it's Monday but past 12:00 PM, the next boundary is next Monday (+7 days)
    if (day === 1 && hours >= 12) {
      daysToMonday = 7;
    } 
    // If it's Monday before 12:00 PM, the boundary is today (+0 days)
    else if (day === 1 && hours < 12) {
      daysToMonday = 0;
    } else if (day === 0) { // If Sunday, Monday is 1 day away
      daysToMonday = 1;
    }

    // Set the strict boundary
    const boundary = new Date(res);
    boundary.setDate(res.getDate() + daysToMonday);
    boundary.setHours(12, 0, 0, 0, 0); // Strictly forces 12:00 PM
    return boundary;
  };

  const firstMondayNoon = getNextMondayNoon(start);
  const WEEK_THRESHOLD_HOURS = 120; // Fixed: 5 days = 120 hours

  if (end.getTime() <= firstMondayNoon.getTime()) {
    const hours = differenceInHours(end, start);
    if (hours >= WEEK_THRESHOLD_HOURS) {
      return { dailyDays: 0, weeklyWeeks: 1 };
    } else {
      const days = hours <= 0 ? 1 : Math.ceil(hours / 24);
      return { dailyDays: days, weeklyWeeks: 0 };
    }
  } else {
    const initialHours = differenceInHours(firstMondayNoon, start);
    let dailyDays = 0;
    let weeklyWeeks = 0;
    
    // Evaluate the initial mid-week start segment
    if (initialHours >= WEEK_THRESHOLD_HOURS) {
      weeklyWeeks += 1;
    } else {
      dailyDays += initialHours <= 0 ? 0 : Math.ceil(initialHours / 24);
    }
    
    // Evaluate remaining hours after the first Monday noon boundary
    // Evaluate remaining hours after the first Monday noon boundary
    const remainingHours = differenceInHours(end, firstMondayNoon);
    if (remainingHours > 0) {
      const fullWeeks = Math.floor(remainingHours / 168); // 168 hours in a standard week
      const leftoverHours = remainingHours % 168; // Remaining hours of the incomplete final week
      
      if (leftoverHours >= WEEK_THRESHOLD_HOURS) {
        weeklyWeeks += fullWeeks + 1;
      } else {
        weeklyWeeks += fullWeeks;
        dailyDays += Math.ceil(leftoverHours / 24);
      }
    }
    
    // ✅ NEW FIX: Normalize accumulated days into weeks
    // If the initial days and final days add up to 7 or more, roll them into a week
    if (dailyDays >= 7) {
      const extraWeeks = Math.floor(dailyDays / 7);
      weeklyWeeks += extraWeeks;
      dailyDays = dailyDays % 7;
    }
    
    return { dailyDays, weeklyWeeks };
  }
};

export const getCalendarWeeks = (startDate: Date, endDate: Date): number => {
  const { weeklyWeeks, dailyDays } = getWeeklyHybridUnits(startDate, endDate);
  return Math.max(1, weeklyWeeks + (dailyDays > 0 ? 1 : 0));
};

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
  discounts: RentalDiscount[] = []
): DetailedRentalCost => {
  if (reason === 'staff' || reason === 'o/d') {
    return { baseNet: 0, baseVat: 0, baseGross: 0, pureHireNet: 0, pureInsuranceNet: 0, discountAmount: 0, net: extraChargesTotal, vat: 0, gross: extraChargesTotal };
  }

  // ✅ FIX: Safely check for negotiated rate to allow 0
  const hasNegotiatedRate = negotiatedRate !== undefined && negotiatedRate !== null;

  // Base rates
  let dailyRate = vehicle?.dailyRentalPrice ?? RENTAL_RATES.daily;
  let weeklyRate = vehicle?.weeklyRentalPrice ?? RENTAL_RATES.weekly;
  let claimRate = vehicle?.claimRentalPrice ?? RENTAL_RATES.claim;

  // Locked past rates
  let pastDailyRate = lockedDailyRate ?? dailyRate;
  let pastWeeklyRate = lockedWeeklyRate ?? weeklyRate;
  let pastClaimRate = lockedClaimRate ?? claimRate;

  // ✅ CRITICAL FIX: Dynamically prorate daily rate for weekly rentals
  if (hasNegotiatedRate) {
    if (type === 'claim' || reason === 'claim') {
      claimRate = negotiatedRate;
      pastClaimRate = negotiatedRate;
    } else if (type === 'weekly') {
      weeklyRate = negotiatedRate;
      pastWeeklyRate = negotiatedRate;
      // Derive partial daily rate from the negotiated weekly rate
      dailyRate = negotiatedRate / 7;
      pastDailyRate = (lockedWeeklyRate ?? negotiatedRate) / 7;
    } else {
      dailyRate = negotiatedRate;
      pastDailyRate = negotiatedRate;
    }
  } else if (type === 'weekly') {
    // Standard weekly rates derive daily rate from the base weekly rate
    dailyRate = weeklyRate / 7;
    pastDailyRate = pastWeeklyRate / 7;
  }

  let baseNet = 0;
  const now = new Date();
  const totalHours = differenceInHours(endDate, startDate);
  const totalDays = totalHours <= 0 ? 1 : Math.ceil(totalHours / 24);
  const hybrid = getWeeklyHybridUnits(startDate, endDate);
  const totalDailyDays = type === 'weekly' ? hybrid.dailyDays : totalDays;
  const totalWeeklyWeeks = type === 'weekly' ? hybrid.weeklyWeeks : 0;

  if (rentalStatus === 'active' && !hasNegotiatedRate) {
    if (isAfter(now, startDate) && isBefore(now, endDate)) {
      const pastHours = differenceInHours(now, startDate);
      const pastDaysAct = Math.max(0, Math.floor(pastHours / 24));
      const futureDaysAct = Math.max(0, totalDays - pastDaysAct);

      if (type === 'claim' || reason === 'claim') baseNet = (pastDaysAct * pastClaimRate) + (futureDaysAct * claimRate);
      else if (type === 'weekly') {
        const pastHybrid = getWeeklyHybridUnits(startDate, now);
        const pDaily = Math.min(totalDailyDays, pastHybrid.dailyDays);
        const pWeekly = Math.min(totalWeeklyWeeks, pastHybrid.weeklyWeeks);
        const fDaily = Math.max(0, totalDailyDays - pDaily);
        const fWeekly = Math.max(0, totalWeeklyWeeks - pWeekly);
        baseNet = (pDaily * pastDailyRate) + (fDaily * dailyRate) + (pWeekly * pastWeeklyRate) + (fWeekly * weeklyRate);
      } else baseNet = (pastDaysAct * pastDailyRate) + (futureDaysAct * dailyRate);
    } else {
      if (isAfter(now, endDate)) {
        if (type === 'claim' || reason === 'claim') baseNet = totalDays * pastClaimRate;
        else if (type === 'weekly') baseNet = (totalDailyDays * pastDailyRate) + (totalWeeklyWeeks * pastWeeklyRate);
        else baseNet = totalDays * pastDailyRate;
      } else {
        if (type === 'claim' || reason === 'claim') baseNet = totalDays * claimRate;
        else if (type === 'weekly') baseNet = (totalDailyDays * dailyRate) + (totalWeeklyWeeks * weeklyRate);
        else baseNet = totalDays * dailyRate;
      }
    }
  } else {
    const activeD = (rentalStatus === 'completed' || rentalStatus === 'cancelled') ? pastDailyRate : dailyRate;
    const activeW = (rentalStatus === 'completed' || rentalStatus === 'cancelled') ? pastWeeklyRate : weeklyRate;
    const activeC = (rentalStatus === 'completed' || rentalStatus === 'cancelled') ? pastClaimRate : claimRate;
    if (type === 'claim' || reason === 'claim') baseNet = totalDays * activeC;
    else if (type === 'weekly') baseNet = (totalDailyDays * activeD) + (totalWeeklyWeeks * activeW);
    else baseNet = totalDays * activeD;
  }

  // Insurance follows the exact same hybrid pattern
  const insuranceCostNet = type === 'weekly'
    ? (totalDailyDays * insurancePerDay) + (totalWeeklyWeeks * insurancePerWeek)
    : totalDays * insurancePerDay;
  
  let baseDiscountAmt = 0;
  let insuranceDiscountAmt = 0;

  if (discounts && discounts.length > 0) {
    discounts.forEach(d => {
      if (d.applyTo === 'insurance') insuranceDiscountAmt += d.amount;
      else baseDiscountAmt += d.amount;
    });
  } else {
    if (discountAmountInput > 0) baseDiscountAmt = discountAmountInput;
    else if (discountPercentage > 0) baseDiscountAmt = baseNet * (discountPercentage / 100);
  }
  
  baseDiscountAmt = Math.min(baseDiscountAmt, baseNet);
  insuranceDiscountAmt = Math.min(insuranceDiscountAmt, insuranceCostNet);

  const discountedBaseNet = baseNet - baseDiscountAmt;
  const discountedInsuranceNet = insuranceCostNet - insuranceDiscountAmt;
  const totalDiscountAmtNet = baseDiscountAmt + insuranceDiscountAmt;

  let finalVat = 0;
  if (includeVAT) finalVat += discountedBaseNet * 0.20;
  if (includeStorageVAT) finalVat += storageCost * 0.20;
  if (includeRecoveryCostVAT) finalVat += recoveryCost * 0.20;
  if (deliveryChargeIncludeVAT) finalVat += deliveryCharge * 0.20;
  if (collectionChargeIncludeVAT) finalVat += collectionCharge * 0.20;
  if (type === 'weekly' && insurancePerWeekIncludeVAT) finalVat += discountedInsuranceNet * 0.20;
  else if (type !== 'weekly' && insurancePerDayIncludeVAT) finalVat += discountedInsuranceNet * 0.20;

  const originalTotalNet = baseNet + storageCost + recoveryCost + deliveryCharge + collectionCharge + insuranceCostNet;
  
  let originalVatAccumulator = 0;
  if (includeVAT) originalVatAccumulator += baseNet * 0.20;
  if (includeStorageVAT) originalVatAccumulator += storageCost * 0.20;
  if (includeRecoveryCostVAT) originalVatAccumulator += recoveryCost * 0.20;
  if (deliveryChargeIncludeVAT) originalVatAccumulator += deliveryCharge * 0.20;
  if (collectionChargeIncludeVAT) originalVatAccumulator += collectionCharge * 0.20;
  if (type === 'weekly' && insurancePerWeekIncludeVAT) originalVatAccumulator += insuranceCostNet * 0.20;
  else if (type !== 'weekly' && insurancePerDayIncludeVAT) originalVatAccumulator += insuranceCostNet * 0.20;

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
    0, 0, rentalStatus, lockedDailyRate, lockedWeeklyRate, lockedClaimRate, extraChargesTotal || 0, []
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
  
  if (rental.type === 'weekly') {
    const scheduled = getWeeklyHybridUnits(new Date(rental.startDate), end);
    const actual = getWeeklyHybridUnits(new Date(rental.startDate), now);
    const overdueDays = Math.max(0, actual.dailyDays - scheduled.dailyDays);
    const overdueWeeks = Math.max(0, actual.weeklyWeeks - scheduled.weeklyWeeks);
    return overdueDays + (overdueWeeks * 7);
  }

  const overdueHours = Math.max(0, differenceInHours(now, end));
  return Math.ceil(overdueHours / 24) || 1;
}

export const calculateOverdueCost = (rental: Rental, now: Date, vehicle?: Vehicle): number => {
  const start = new Date(rental.startDate);
  const end = new Date(rental.endDate);
  if (now <= end) return 0;
  
  const hasNegotiatedRate = rental.negotiatedRate !== undefined && rental.negotiatedRate !== null;

  let dailyRate = vehicle?.dailyRentalPrice ?? RENTAL_RATES.daily;
  let weeklyRate = vehicle?.weeklyRentalPrice ?? RENTAL_RATES.weekly;
  let claimRate = vehicle?.claimRentalPrice ?? RENTAL_RATES.claim;

  // ✅ CRITICAL FIX: Apply prorated logic to overdue costs
  if (hasNegotiatedRate) {
    if (rental.type === 'claim' || rental.reason === 'claim') {
      claimRate = rental.negotiatedRate!;
    } else if (rental.type === 'weekly') {
      weeklyRate = rental.negotiatedRate!;
      dailyRate = rental.negotiatedRate! / 7;
    } else {
      dailyRate = rental.negotiatedRate!;
    }
  } else if (rental.type === 'weekly') {
    dailyRate = weeklyRate / 7;
  }

  if (rental.type === 'weekly') {
    const scheduled = getWeeklyHybridUnits(start, end);
    const actual = getWeeklyHybridUnits(start, now);
    const overdueDays = Math.max(0, actual.dailyDays - scheduled.dailyDays);
    const overdueWeeks = Math.max(0, actual.weeklyWeeks - scheduled.weeklyWeeks);
    let cost = (overdueDays * dailyRate) + (overdueWeeks * weeklyRate);
    if (rental.includeVAT) cost *= 1.2;
    return Math.max(0, cost);
  } else {
    const units = getOverdueUnits(rental, now);
    let rate = rental.type === 'claim' || rental.reason === 'claim' ? claimRate : dailyRate;
    let cost = units * rate;
    if (rental.includeVAT) cost *= 1.2;
    return Math.max(0, cost);
  }
};

export const calculateDiscount = (totalAmount: number, discountPercentage: number): number => {
  if (!totalAmount || !discountPercentage) return 0;
  return (totalAmount * discountPercentage) / 100;
};