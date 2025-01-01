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

    const companyDetails = {
      fullName: companyDoc.data().fullName || 'AIE SKYLINE',
      name: companyDoc.data().name || '',
      officialAddress: companyDoc.data().officialAddress || '',
      phone: companyDoc.data().phone || '',
      email: companyDoc.data().email || '',
      vatNumber: companyDoc.data().vatNumber || '',
      registrationNumber: companyDoc.data().registrationNumber || '',
      termsAndConditions: companyDoc.data().termsAndConditions || '',
      signature: companyDoc.data().signature || ''
    };

    // Generate both documents in parallel
    const [agreementBlob, invoiceBlob] = await Promise.all([
      pdf(createElement(RentalAgreement, {
        rental,
        vehicle,
        customer,
        companyDetails
      })).toBlob(),
      pdf(createElement(RentalInvoice, {
        rental,
        vehicle,
        customer,
        companyDetails
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