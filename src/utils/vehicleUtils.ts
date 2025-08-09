// src/utils/vehicleUtils.ts
import { Vehicle } from '../types';
import { addDays, isBefore, isAfter, differenceInDays } from 'date-fns';
import { toDate } from './dateUtils'; // Assuming this utility exists for date conversion

export interface ExpiryCheck {
  date: Date;
  type: string;
  label: string;
}

/**
 * Retrieves all relevant expiry dates for a given vehicle.
 * @param vehicle The vehicle object.
 * @returns An array of expiry date checks.
 */
export const getVehicleExpiryDates = (vehicle: Vehicle): ExpiryCheck[] => {
  return [
    { date: toDate(vehicle.motExpiry), type: 'mot', label: 'MOT' },
    { date: toDate(vehicle.nslExpiry), type: 'nsl', label: 'NSL' },
    { date: toDate(vehicle.roadTaxExpiry), type: 'roadTax', label: 'Road Tax' },
    { date: toDate(vehicle.insuranceExpiry), type: 'insurance', label: 'Insurance' }
  ].filter((check): check is ExpiryCheck & { date: Date } => check.date !== null);
};

/**
 * Filters vehicles to find those with upcoming expirations within a given threshold.
 * @param vehicles An array of vehicle objects.
 * @param daysThreshold The number of days to consider as "upcoming". Default is 30 days.
 * @returns An array of vehicles with upcoming expirations.
 */
export const getUpcomingExpirations = (vehicles: Vehicle[], daysThreshold = 30): Vehicle[] => {
  const today = new Date();
  
  return vehicles.filter(vehicle => {
    const expiryDates = getVehicleExpiryDates(vehicle);
    return expiryDates.some(({ date }) => 
      isBefore(today, addDays(date, daysThreshold))
    );
  });
};

/**
 * Checks if a given date is expiring soon (within 30 days) or has already expired.
 * @param date The date to check.
 * @returns True if expiring or expired, false otherwise.
 */
export const isExpiringOrExpired = (date: Date | null | undefined): boolean => {
  if (!date) return false;
  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);
  // Check if the date is in the past OR within the next 30 days
  return isBefore(date, now) || (isBefore(date, thirtyDaysFromNow) && isAfter(date, now));
};

/**
 * Checks if a vehicle's next service mileage is overdue.
 * @param vehicle The vehicle object.
 * @returns True if service is overdue, false otherwise.
 */
export const isServiceOverdue = (vehicle: Vehicle): boolean => {
  return vehicle.mileage >= vehicle.nextServiceMileage;
};

/**
 * Checks if a vehicle's next service mileage is due soon (e.g., within 1000 miles).
 * @param vehicle The vehicle object.
 * @param thresholdMiles The mileage threshold for "due soon". Default is 1000 miles.
 * @returns True if service is due soon, false otherwise.
 */
export const isServiceDueSoon = (vehicle: Vehicle, thresholdMiles: number = 1000): boolean => {
  // Service is due soon if current mileage is within thresholdMiles of nextServiceMileage
  // and it's not already overdue.
  return (
    vehicle.mileage < vehicle.nextServiceMileage &&
    (vehicle.nextServiceMileage - vehicle.mileage <= thresholdMiles)
  );
};

/**
 * Calculates the number of days until a date, or how many days it's overdue.
 * @param date The date to calculate against.
 * @returns Number of days (positive for future, negative for past), or null if date is invalid.
 */
export const getDaysUntil = (date: Date | null | undefined): number | null => {
  if (!date) return null;
  const now = new Date();
  return differenceInDays(date, now);
};

/**
 * Determines the status of a vehicle's next service based on mileage.
 * @param vehicle The vehicle object.
 * @returns 'overdue', 'due-soon', or 'ok'.
 */
export const getServiceMileageStatus = (vehicle: Vehicle): 'overdue' | 'due-soon' | 'ok' => {
  if (isServiceOverdue(vehicle)) {
    return 'overdue';
  }
  if (isServiceDueSoon(vehicle)) {
    return 'due-soon';
  }
  return 'ok';
};

/**
 * Checks if a vehicle can be deleted.
 * @param vehicle The vehicle object.
 * @returns True if the vehicle can be deleted, false otherwise.
 */
export const canDeleteVehicle = (vehicle: Vehicle): boolean => {
  return vehicle.status === 'sold';
};
