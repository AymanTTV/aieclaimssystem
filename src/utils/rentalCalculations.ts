import { addDays, differenceInDays, isMonday, nextMonday, isAfter } from 'date-fns';
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

  // Calculate total days (including end date)
  const totalDays = differenceInDays(endDate, startDate) + 1;

  // For claim rentals
  if (type === 'claim') {
    return totalDays * claimRate;
  }

  // For weekly rentals
  if (type === 'weekly') {
  const fullWeeks = Math.floor(totalDays / 7);
  const extraDays = totalDays % 7;

  // If total days exactly match full weeks, charge weekly rate only
  if (extraDays === 0) {
    return fullWeeks * weeklyRate;
  }

  // Otherwise, handle rentals starting midweek
  if (startDay !== 1) {
    const nextMon = nextMonday(startDate);
    const daysUntilMonday = differenceInDays(nextMon, startDate);

    const initialCost = daysUntilMonday * dailyRate;

    if (differenceInDays(endDate, nextMon) < 0) {
      return initialCost;
    }

    const remainingDays = differenceInDays(endDate, nextMon) + 1;
    const fullWeeks = Math.floor(remainingDays / 7);
    const extraDays = remainingDays % 7;

    return initialCost + 
           (fullWeeks * weeklyRate) + 
           (extraDays * dailyRate);
  }

  return (fullWeeks * weeklyRate) + (extraDays * dailyRate);
}


  // For daily rentals
  if (totalDays >= 7) {
    const weeks = Math.floor(totalDays / 7);
    const extraDays = totalDays % 7;
    
    // If extra days cost more than a week, charge weekly rate
    if (extraDays * dailyRate > weeklyRate) {
      return (weeks + 1) * weeklyRate;
    }
    
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
  if (!isAfter(currentDate, rental.endDate)) return 0;

  const dailyRate = vehicle?.dailyRentalPrice || RENTAL_RATES.daily;
  const weeklyRate = vehicle?.weeklyRentalPrice || RENTAL_RATES.weekly;
  const claimRate = vehicle?.claimRentalPrice || RENTAL_RATES.claim;

  // Calculate overdue days including partial days
  const overdueDays = Math.ceil((currentDate.getTime() - rental.endDate.getTime()) / (1000 * 60 * 60 * 24));

  // For claim rentals, always use claim rate
  if (rental.type === 'claim' || rental.reason === 'claim') {
    return overdueDays * claimRate;
  }

  // For weekly rentals
  if (rental.type === 'weekly') {
    const weeks = Math.floor(overdueDays / 7);
    const remainingDays = overdueDays % 7;

    // If remaining days cost more than a week, charge weekly rate
    if (remainingDays * dailyRate > weeklyRate) {
      return (weeks + 1) * weeklyRate;
    }

    return (weeks * weeklyRate) + (remainingDays * dailyRate);
  }

  // For daily rentals
  if (overdueDays >= 7) {
    const weeks = Math.floor(overdueDays / 7);
    const remainingDays = overdueDays % 7;

    // If remaining days cost more than a week, charge weekly rate
    if (remainingDays * dailyRate > weeklyRate) {
      return (weeks + 1) * weeklyRate;
    }

    return (weeks * weeklyRate) + (remainingDays * dailyRate);
  }

  // Less than 7 days overdue - charge daily rate
  return overdueDays * dailyRate;
};

// Helper function to get available vehicles
export const getAvailableVehicles = (
  vehicles: Vehicle[],
  startDate: Date,
  endDate: Date,
  currentRentals: Rental[]
): Vehicle[] => {
  return vehicles.filter(vehicle => {
    // Only include available vehicles or vehicles with completed rentals
    if (vehicle.status !== 'available' && vehicle.status !== 'completed') {
      return false;
    }

    // Check for rental conflicts
    const hasConflict = currentRentals.some(rental => {
      if (rental.vehicleId !== vehicle.id) return false;
      if (rental.status === 'completed' || rental.status === 'cancelled') return false;

      // Check for date overlap
      return !(endDate <= rental.startDate || startDate >= rental.endDate);
    });

    return !hasConflict;
  });
};