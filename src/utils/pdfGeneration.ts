import { pdf } from '@react-pdf/renderer';
import { RentalAgreement, RentalInvoice } from '../components/pdf';
import { Rental, Vehicle, Customer } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createElement } from 'react';

/**
 * Gets company details including signature
 */
const getCompanyDetails = async () => {
  const docRef = doc(db, 'companySettings', 'details');
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('Company details not found');
  }
  return docSnap.data();
};

/**
 * Generates rental agreement PDF
 */
export const generateRentalAgreement = async (
  rental: Rental,
  vehicle: Vehicle,
  customer: Customer
): Promise<Blob> => {
  const companyDetails = await getCompanyDetails();
  
  return pdf(createElement(RentalAgreement, {
    rental,
    vehicle,
    customer,
    companySignature: companyDetails.signature,
    customerSignature: rental.signature
  })).toBlob();
};

/**
 * Generates rental invoice PDF
 */
export const generateRentalInvoice = async (
  rental: Rental,
  vehicle: Vehicle,
  customer: Customer
): Promise<Blob> => {
  const companyDetails = await getCompanyDetails();

  return pdf(createElement(RentalInvoice, {
    rental,
    vehicle,
    customer,
    companyDetails
  })).toBlob();
};