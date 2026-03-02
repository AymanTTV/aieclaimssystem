// src/types/customer.ts

import { addYears, addDays } from 'date-fns';

export type Gender = 'male' | 'female' | 'other';
export type CustomerType = 'customer' | 'claim' | 'company';

export interface Customer {
  id: string;
  type: CustomerType;
  name: string;
  mobile: string;
  email: string;
  address: string;

  // New Company Fields
  accountNumber?: string;
  vatNumber?: string;

  // Add this new field:
  signatureRequestToken?: string;

  // Optional fields not applicable to 'company' type
  gender?: Gender;
  dateOfBirth?: Date;
  nationalInsuranceNumber?: string;
  
  // License Details
  driverLicenseNumber?: string;
  issueNumber?: string; // [NEW]
  countryOfIssue?: string; // [NEW]
  
  licenseValidFrom?: Date;
  licenseExpiry?: Date;
  badgeNumber?: string;
  billExpiry?: Date;
  age?: number;
  signature?: string;

  // Document URLs
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
  billDocumentUrl?: string;
  documentUrl?: string;

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

export const isExpiringOrExpired = (date: Date | undefined | null): boolean => {
  if (!date) return false; // Handle null or undefined dates

  const now = new Date();
  const thirtyDaysFromNow = addDays(now, 30);

  return date < now || (date <= thirtyDaysFromNow && date >= now); // Expired OR expiring soon
};

export const isExpired = (date: Date): boolean => {
  return new Date() > date;
};

export const getDefaultExpiryDate = (): Date => {
  return addYears(new Date(), 1);
};