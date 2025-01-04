import { pdf } from '@react-pdf/renderer';
import { Invoice, Vehicle } from '../types';
import { createElement } from 'react';
import { InvoicePDF } from '../components/pdf/InvoicePDF';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const generateInvoicePDF = async (invoice: Invoice, vehicle?: Vehicle): Promise<Blob> => {
  try {
    // Get company details
    const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
    if (!companyDoc.exists()) {
      throw new Error('Company details not found');
    }
    const companyDetails = companyDoc.data();

    // Generate PDF
    return pdf(createElement(InvoicePDF, {
      invoice,
      vehicle,
      companyDetails
    })).toBlob();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw new Error('Failed to generate invoice PDF');
  }
};
