import { addYears } from 'date-fns';

export type Gender = 'male' | 'female' | 'other';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  gender: Gender;
  dateOfBirth: Date;
  nationalInsuranceNumber: string;
  driverLicenseNumber: string;
  licenseValidFrom: Date;
  licenseExpiry: Date;
  isExpired: Date;
  badgeNumber: string;
  billExpiry: Date;
  age: number;
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const calculateAge = (dateOfBirth: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  
  return age;
};

export const isExpired = (date: Date): boolean => {
  return new Date() > date;
};

export const getDefaultExpiryDate = (): Date => {
  return addYears(new Date(), 1);
};