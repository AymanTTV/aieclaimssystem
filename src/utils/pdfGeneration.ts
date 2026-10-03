// src/utils/pdfGeneration.ts

import { pdf } from '@react-pdf/renderer';
import { RentalAgreement, RentalInvoice } from '../components/pdf';
import { Rental, Vehicle, Customer, Invoice } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createElement } from 'react';
import { InvoicePDF } from '../components/pdf/InvoicePDF';
import { getAvailableCompanyEntities, buildEffectiveDocumentCompanyDetails } from './entityBranding';

// Get company details including signature
const getCompanyDetails = async () => {
  const docRef = doc(db, 'companySettings', 'details');
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    throw new Error('Company details not found');
  }
  return docSnap.data();
};

const resolveEffectiveCompanyDetails = (baseCompanyDetails: any, rental?: any) => {
  const availableEntities = getAvailableCompanyEntities(baseCompanyDetails);
  const targetKey =
    rental?.corporateEntityKey ||
    (rental?.type === 'claim' ? 'aie_claims' : 'aie_skyline');
  const matchedEntity =
    availableEntities.find(
      (e) =>
        e.key === targetKey ||
        e.id === targetKey ||
        (rental?.corporateEntityName &&
          (e.fullName.toLowerCase() === rental.corporateEntityName.toLowerCase() ||
           e.tradingName.toLowerCase() === rental.corporateEntityName.toLowerCase())) ||
        (Boolean(targetKey) && targetKey.includes('sayarah') && e.key.includes('sayarah'))
    ) || availableEntities[0];

  return buildEffectiveDocumentCompanyDetails(baseCompanyDetails, matchedEntity, {
    corporateEntityKey: matchedEntity.key,
    corporateEntityName: matchedEntity.fullName,
  });
};

// Generate rental agreement PDF
export const generateRentalAgreement = async (
  rental: Rental,
  vehicle: Vehicle,
  customer: Customer
): Promise<Blob> => {
  const baseDetails = await getCompanyDetails();
  const companyDetails = resolveEffectiveCompanyDetails(baseDetails, rental);
  
  return pdf(createElement(RentalAgreement, {
    rental,
    vehicle,
    customer,
    companyDetails
  })).toBlob();
};

// Generate rental invoice PDF
export const generateRentalInvoice = async (
  rental: Rental,
  vehicle: Vehicle,
  customer: Customer
): Promise<Blob> => {
  const baseDetails = await getCompanyDetails();
  const companyDetails = resolveEffectiveCompanyDetails(baseDetails, rental);

  return pdf(createElement(RentalInvoice, {
    rental,
    vehicle,
    customer,
    companyDetails
  })).toBlob();
};

// Generate invoice PDF
export const generateInvoicePDF = async (invoice: Invoice, vehicle?: Vehicle): Promise<Blob> => {
  const companyDetails = await getCompanyDetails();
  
  return pdf(createElement(InvoicePDF, {
    invoice,
    vehicle,
    companyDetails
  })).toBlob();
};
