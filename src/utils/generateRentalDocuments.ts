// src/utils/generateRentalDocuments.ts

import { pdf } from '@react-pdf/renderer';
import { RentalAgreement, RentalInvoice } from '../components/pdf';
import { Rental, Vehicle, Customer } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createElement } from 'react';
import toast from 'react-hot-toast';

export const generateRentalDocuments = async (
  rental: Rental,
  vehicle: Vehicle,
  customer: Customer
): Promise<{ agreement: Blob; invoice: Blob }> => {
  try {
    // Validate required data
    if (!rental || !vehicle || !customer) {
      throw new Error('Missing required data for document generation');
    }

    // Get company details
    const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
    if (!companyDoc.exists()) {
      throw new Error('Company details not found');
    }

    const companyDetails = companyDoc.data();

    // Validate company details
    if (!companyDetails.fullName || !companyDetails.officialAddress) {
      throw new Error('Incomplete company details');
    }

    // Ensure dates are valid Date objects
    const validatedRental = {
      ...rental,
      startDate: new Date(rental.startDate),
      endDate: new Date(rental.endDate),
      createdAt: new Date(rental.createdAt),
      updatedAt: new Date(rental.updatedAt)
    };

    // Generate agreement PDF
    const agreementBlob = await pdf(createElement(RentalAgreement, {
      rental: validatedRental,
      vehicle,
      customer,
      companyDetails
    })).toBlob();

    // Generate invoice PDF
    const invoiceBlob = await pdf(createElement(RentalInvoice, {
      rental: validatedRental,
      vehicle,
      customer,
      companyDetails
    })).toBlob();

    if (!agreementBlob || !invoiceBlob) {
      throw new Error('Failed to generate PDF documents');
    }

    return {
      agreement: agreementBlob,
      invoice: invoiceBlob
    };
  } catch (error) {
    console.error('Error generating rental documents:', error);
    toast.error('Failed to generate rental documents. Please check company settings.');
    throw error;
  }
};
