import { pdf } from '@react-pdf/renderer';
import { Invoice, Vehicle } from '../types';
import { createElement } from 'react';
import { InvoiceDocument } from '../components/pdf/documents';
import { getCompanyDetails } from './documentGenerator';

export const generateInvoicePDF = async (invoice: Invoice, vehicle?: Vehicle): Promise<Blob> => {
  try {
    const companyDetails = await getCompanyDetails();

    // Generate modern PDF using official InvoiceDocument
    return pdf(createElement(InvoiceDocument, {
      data: {
        ...invoice,
        vehicle,
      },
      companyDetails
    })).toBlob();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    throw new Error('Failed to generate invoice PDF');
  }
};
