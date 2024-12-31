import { useState } from 'react';
import { Rental, Vehicle, Customer } from '../types';
import { generateRentalAgreement, generateRentalInvoice } from '../utils/pdfGeneration';
import { uploadPDF } from '../utils/pdfStorage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useCompanyDetails } from './useCompanyDetails';
import toast from 'react-hot-toast';

export const useRentalDocuments = () => {
  const [loading, setLoading] = useState(false);
  const { companyDetails } = useCompanyDetails();

  const generateDocuments = async (
    rental: Rental,
    vehicle: Vehicle,
    customer: Customer
  ) => {
    if (!companyDetails) {
      toast.error('Company details not found');
      return;
    }

    setLoading(true);

    try {
      // Generate PDFs
      const [agreementPDF, invoicePDF] = await Promise.all([
        generateRentalAgreement(rental, vehicle, customer, companyDetails),
        generateRentalInvoice(rental, vehicle, customer, companyDetails)
      ]);

      // Upload PDFs
      const [agreementURL, invoiceURL] = await Promise.all([
        uploadPDF(agreementPDF, `rentals/${rental.id}/agreement.pdf`),
        uploadPDF(invoicePDF, `rentals/${rental.id}/invoice.pdf`)
      ]);

      // Update rental record with document URLs
      await updateDoc(doc(db, 'rentals', rental.id), {
        documents: {
          agreement: agreementURL,
          invoice: invoiceURL
        },
        updatedAt: new Date()
      });

      toast.success('Documents generated and stored successfully');
      return { agreementURL, invoiceURL };
    } catch (error) {
      console.error('Error generating documents:', error);
      toast.error('Failed to generate documents');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateDocuments,
    loading
  };
};