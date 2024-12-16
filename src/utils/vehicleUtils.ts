import { Vehicle } from '../types';
import { addDays, isBefore, isAfter } from 'date-fns';
import { toDate } from './dateUtils';

export interface ExpiryCheck {
  date: Date;
  type: string;
  label: string;
}

export const getVehicleExpiryDates = (vehicle: Vehicle): ExpiryCheck[] => {
  return [
    { date: toDate(vehicle.motExpiry), type: 'mot', label: 'MOT' },
    { date: toDate(vehicle.nslExpiry), type: 'nsl', label: 'NSL' },
    { date: toDate(vehicle.roadTaxExpiry), type: 'roadTax', label: 'Road Tax' },
    { date: toDate(vehicle.insuranceExpiry), type: 'insurance', label: 'Insurance' }
  ].filter((check): check is ExpiryCheck & { date: Date } => check.date !== null);
};

export const getUpcomingExpirations = (vehicles: Vehicle[], daysThreshold = 30): Vehicle[] => {
  const today = new Date();
  
  return vehicles.filter(vehicle => {
    const expiryDates = getVehicleExpiryDates(vehicle);
    return expiryDates.some(({ date }) => 
      isBefore(today, addDays(date, daysThreshold))
    );
  });
};

export const isExpiringOrExpired = (date: Date): boolean => {
  const today = new Date();
  const warningDate = addDays(today, 30);
  return isAfter(today, date) || isBefore(date, warningDate);
};

export const canDeleteVehicle = (vehicle: Vehicle): boolean => {
  return vehicle.status === 'sold';
};