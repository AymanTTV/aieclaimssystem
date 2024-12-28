import { Rental } from '../types';
import { isWithinInterval } from 'date-fns';

export const checkRentalConflict = (
  rentals: Rental[],
  vehicleId: string,
  startDate: Date,
  endDate: Date,
  excludeRentalId?: string
): boolean => {
  return rentals.some(rental => {
    // Skip the current rental being edited
    if (excludeRentalId && rental.id === excludeRentalId) {
      return false;
    }

    // Only check active or scheduled rentals for the same vehicle
    if (rental.vehicleId !== vehicleId || 
        rental.status === 'completed' || 
        rental.status === 'cancelled') {
      return false;
    }

    // Check if dates overlap
    return (
      isWithinInterval(startDate, { start: rental.startDate, end: rental.endDate }) ||
      isWithinInterval(endDate, { start: rental.startDate, end: rental.endDate }) ||
      isWithinInterval(rental.startDate, { start: startDate, end: endDate })
    );
  });
};

export const validateRentalDates = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): { isValid: boolean; error?: string } => {
  try {
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    
    if (end <= start) {
      return {
        isValid: false,
        error: 'End date/time must be after start date/time'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid date/time format'
    };
  }
};