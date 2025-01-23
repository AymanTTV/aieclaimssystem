import { addDays, differenceInDays, isMonday, nextMonday } from 'date-fns';
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
  if (reason === 'claim') return differenceInDays(endDate, startDate) * claimRate;

  // Calculate total days
  const totalDays = Math.max(1, differenceInDays(endDate, startDate));

  // For claim rentals
  if (type === 'claim') {
    return totalDays * claimRate;
  }

  // For weekly rentals
  // For weekly rentals
if (type === 'weekly') {
  const startDay = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // If not starting on Monday
  if (startDay !== 1) {
    // Calculate days until next Monday
    const daysUntilMonday = startDay === 0 ? 1 : 8 - startDay;
    const initialDays = Math.min(daysUntilMonday, totalDays);
    
    // Calculate initial cost (daily rate until Monday)
    const initialCost = initialDays * dailyRate;
    
    // If rental ends before next Monday, return only daily rate
    if (totalDays <= initialDays) {
      return initialCost;
    }
    
    // Calculate remaining days after reaching Monday
    const remainingDays = totalDays - initialDays;
    const fullWeeks = Math.floor(remainingDays / 7);
    const extraDays = remainingDays % 7;
    
    return initialCost + 
           (fullWeeks * weeklyRate) + 
           (extraDays * dailyRate);
  }
  
  // Starting on Monday - calculate full weeks and remaining days
  const fullWeeks = Math.floor(totalDays / 7);
  const extraDays = totalDays % 7;
  
  return (fullWeeks * weeklyRate) + (extraDays * dailyRate);
}



  // For daily rentals
  if (totalDays >= 7) {
    const fullWeeks = Math.floor(totalDays / 7);
    const extraDays = totalDays % 7;
    
    // If extra days cost more than a week, charge weekly rate
    if (extraDays * dailyRate > weeklyRate) {
      return (fullWeeks + 1) * weeklyRate;
    }
    
    return (fullWeeks * weeklyRate) + (extraDays * dailyRate);
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
  if (rental.type === 'claim' || rental.reason === 'claim') {
    return extraDays * claimRate;
  }

  // For weekly rentals
  if (rental.type === 'weekly') {
    const weeks = Math.floor(extraDays / 7);
    const remainingDays = extraDays % 7;

    // If remaining days cost more than a week, charge weekly rate
    if (remainingDays * dailyRate > weeklyRate) {
      return (weeks + 1) * weeklyRate;
    }

    return (weeks * weeklyRate) + (remainingDays * dailyRate);
  }

  // For daily rentals
  if (extraDays >= 7) {
    const weeks = Math.floor(extraDays / 7);
    const remainingDays = extraDays % 7;

    // If remaining days cost more than a week, charge weekly rate
    if (remainingDays * dailyRate > weeklyRate) {
      return (weeks + 1) * weeklyRate;
    }

    return (weeks * weeklyRate) + (remainingDays * dailyRate);
  }

  // Less than 7 days overdue - charge daily rate
  return extraDays * dailyRate;
};

export const isDocumentExpiringWithinWeek = (date: Date): boolean => {
  const oneWeek = addDays(new Date(), 7);
  return date <= oneWeek;
};

export const checkVehicleDocuments = (vehicle: Vehicle): string[] => {
  const expiringDocs: string[] = [];
  
  if (isDocumentExpiringWithinWeek(vehicle.motExpiry)) {
    expiringDocs.push('MOT');
  }
  if (isDocumentExpiringWithinWeek(vehicle.insuranceExpiry)) {
    expiringDocs.push('Insurance');
  }
  if (isDocumentExpiringWithinWeek(vehicle.nslExpiry)) {
    expiringDocs.push('NSL');
  }
  if (isDocumentExpiringWithinWeek(vehicle.roadTaxExpiry)) {
    expiringDocs.push('Road Tax');
  }

  return expiringDocs;
};
