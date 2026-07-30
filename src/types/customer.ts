// src/types/customer.ts

import { addYears, addDays } from 'date-fns';

export type Gender = 'male' | 'female' | 'other';
export type CustomerType = 'customer' | 'claim' | 'company';
export type CustomerStatus = 'active' | 'inactive';
export type BillCopyStatus = 'available' | 'unavailable'; // [NEW]

export interface Customer {
  id: string;
  type: CustomerType;
  status?: CustomerStatus; 
  
  // [NEW] Physical Bill Copy tracking
  billCopyStatus?: BillCopyStatus; 
  billCopyNote?: string;

  name: string;
  mobile: string;
  email: string;
  address: string;

  accountNumber?: string;
  vatNumber?: string;

  signatureRequestToken?: string;
  signatureRequestExpiresAt?: Date;
  
  gender?: Gender;
  dateOfBirth?: Date;
  nationalInsuranceNumber?: string;
  
  driverLicenseNumber?: string;
  issueNumber?: string;
  countryOfIssue?: string;
  
  licenseValidFrom?: Date;
  licenseExpiry?: Date;
  badgeNumber?: string;
  billExpiry?: Date;
  age?: number;
  signature?: string;

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

export const isExpired = (date: Date | undefined | null): boolean => {
  if (!date) return false;
  return new Date() > date;
};

export const isExpiringSoon = (date: Date | undefined | null): boolean => {
  if (!date) return false;
  const now = new Date();
  const warningDate = addDays(now, 14); // 2 weeks
  return date >= now && date <= warningDate;
};

export const isExpiringOrExpired = (date: Date | undefined | null): boolean => {
  return isExpired(date) || isExpiringSoon(date);
};

export const getDefaultExpiryDate = (): Date => {
  return addYears(new Date(), 1);
};