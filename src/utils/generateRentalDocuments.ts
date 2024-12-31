import { pdf } from '@react-pdf/renderer';
import { RentalAgreement, RentalInvoice } from '../components/pdf';
import { Rental, Vehicle, Customer } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createElement } from 'react';

/**
 * Generates all rental documents
 */
export const generateRentalDocuments = async (
  rental: Rental,
  vehicle: Vehicle,
  customer: Customer
): Promise<{ agreement: Blob; invoice: Blob }> => {
  try {
    // Get company details including signature
    const companyDetails = await getDoc(doc(db, 'companySettings', 'details'));
    if (!companyDetails.exists()) {
      throw new Error('Company details not found');
    }

    // Generate both documents in parallel
    const [agreementBlob, invoiceBlob] = await Promise.all([
      pdf(createElement(RentalAgreement, {
        rental,
        vehicle,
        customer,
        companySignature: companyDetails.data().signature,
        customerSignature: rental.signature
      })).toBlob(),
      pdf(createElement(RentalInvoice, {
        rental,
        vehicle,
        customer,
        companyDetails: companyDetails.data()
      })).toBlob()
    ]);

    return {
      agreement: agreementBlob,
      invoice: invoiceBlob
    };
  } catch (error) {
    console.error('Error generating rental documents:', error);
    throw new Error('Failed to generate rental documents');
  }
};