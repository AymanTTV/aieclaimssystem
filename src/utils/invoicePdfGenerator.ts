import { pdf } from '@react-pdf/renderer';
import { Invoice, Vehicle } from '../types';
import { createElement } from 'react';
import { InvoiceDocument } from '../components/pdf/documents';
import { getCompanyDetails } from './documentGenerator';
import { getAvailableCompanyEntities, buildEffectiveDocumentCompanyDetails } from './entityBranding';

export const generateInvoicePDF = async (invoice: Invoice, vehicle?: Vehicle): Promise<Blob> => {
  try {
    const rawCompanyDetails = await getCompanyDetails();
    const availableEntities = getAvailableCompanyEntities(rawCompanyDetails);
    const targetKey = invoice.corporateEntityKey || invoice.issuingEntity || 'aie_skyline';
    const chosenEntity = availableEntities.find(e => e.key === targetKey) || availableEntities[0];
    const companyDetails = buildEffectiveDocumentCompanyDetails(rawCompanyDetails, chosenEntity);

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
