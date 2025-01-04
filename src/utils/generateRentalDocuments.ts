import { pdf } from '@react-pdf/renderer';
import { RentalAgreement, RentalInvoice } from '../components/pdf';
import { Rental, Vehicle, Customer } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createElement } from 'react';

export const generateRentalDocuments = async (
  rental: Rental,
  vehicle: Vehicle,
  customer: Customer
): Promise<{ agreement: Blob; invoice: Blob }> => {
  try {
    // Get company details
    const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
    if (!companyDoc.exists()) {
      throw new Error('Company details not found');
    }

    const companyDetails = companyDoc.data();

    // Generate agreement PDF
    const agreementBlob = await pdf(createElement(RentalAgreement, {
      rental,
      vehicle,
      customer,
      companyDetails
    })).toBlob();

    // Generate invoice PDF
    const invoiceBlob = await pdf(createElement(RentalInvoice, {
      rental,
      vehicle,
      customer,
      companyDetails
    })).toBlob();

    return {
      agreement: agreementBlob,
      invoice: invoiceBlob
    };
  } catch (error) {
    console.error('Error generating rental documents:', error);
    throw new Error('Failed to generate rental documents');
  }
};