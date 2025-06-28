// src/utils/generateRentalDocuments.ts

import { pdf } from '@react-pdf/renderer';
import { RentalAgreement, RentalInvoice } from '../components/pdf';
import { Rental, Vehicle, Customer } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createElement } from 'react';
import toast from 'react-hot-toast';
import {
  ConditionOfHire,
  CreditHireMitigation,
  NoticeOfRightToCancel,
  CreditStorageAndRecovery,
  HireAgreement,
  SatisfactionNotice
} from '../components/pdf/claims';

import { ParkingPermitLetter } from '../components/pdf/ParkingPermitLetter';

export const generateRentalDocuments = async (
  rental: Rental,
  vehicle: Vehicle,
  customer: Customer
): Promise<{ agreement: Blob; invoice: Blob; permit: Blob; claimDocuments?: Record<string, Blob> }> => {
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


    // parking permit
    const permitBlob = await pdf(createElement(ParkingPermitLetter, {
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

    // For claim rentals, generate additional claim documents
    if (rental.type === 'claim' || rental.reason === 'claim') {
      console.log("Generating claim documents for rental:", rental.id);
      const claimDocuments: Record<string, Blob> = {};

      // Calculate days of hire
      const startDate = new Date(rental.startDate);
      const endDate = new Date(rental.endDate);
      const daysOfHire = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Create a claim-like object from rental data
      const claimData = {
        id: rental.id,
        clientRef: rental.claimRef || rental.id.slice(-8).toUpperCase(),
        clientInfo: {
          name: customer.name,
          phone: customer.mobile,
          email: customer.email,
          dateOfBirth: customer.dateOfBirth,
          driverLicenseNumber: customer.driverLicenseNumber,
          licenseExpiry: customer.licenseExpiry,
          address: customer.address,
          signature: rental.signature || customer.signature || '',
        },
        clientVehicle: {
          registration: vehicle.registrationNumber,
          documents: {},
          motExpiry: vehicle.motExpiry,
          roadTaxExpiry: vehicle.roadTaxExpiry,
        },
        incidentDetails: {
          date: new Date(),
          time: '00:00',
          location: '',
          description: `Rental claim for ${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`,
          damageDetails: '',
        },
        thirdParty: {
          name: '',
          phone: '',
          address: '',
          email: '',
          registration: '',
        },
        hireDetails: {
          enabled: true,
          startDate: rental.startDate,
          startTime: new Date(rental.startDate).toTimeString().slice(0, 5),
          endDate: rental.endDate,
          endTime: new Date(rental.endDate).toTimeString().slice(0, 5),
          daysOfHire: daysOfHire,
          claimRate: vehicle.claimRentalPrice || 340,
          deliveryCharge: rental.deliveryCharge || 0,
          collectionCharge: rental.collectionCharge || 0,
          insurancePerDay: rental.insurancePerDay || 0,
          totalCost: rental.cost,
          vehicle: {
            make: vehicle.make,
            model: vehicle.model,
            registration: vehicle.registrationNumber,
            claimRate: vehicle.claimRentalPrice || 340,
          },
        },
        storage: rental.storageCost ? {
          enabled: true,
          startDate: rental.storageStartDate,
          endDate: rental.storageEndDate,
          costPerDay: rental.storageCostPerDay || 0,
          totalCost: rental.storageCost,
        } : null,
        recovery: rental.recoveryCost ? {
          enabled: true,
          date: rental.startDate,
          locationPickup: '',
          locationDropoff: '',
          cost: rental.recoveryCost,
        } : null,
        fileHandlers: {
          aieHandler: '',
          legalHandler: '',
        },
        evidence: {
          images: [],
          videos: [],
          clientVehiclePhotos: [],
          engineerReport: [],
          bankStatement: [],
          adminDocuments: [],
        },
        claimType: 'Domestic',
        claimReason: ['H'],
        // Correctly set caseProgress based on rental.status or a dedicated claim progress field
        // Assuming rental.status 'completed' means claim is completed, otherwise 'Awaiting'
        caseProgress: rental.status === 'completed' ? 'Completed' : 'Awaiting',
        progress: 'Your Claim Has Started',
        progressHistory: [],
        createdBy: rental.createdBy,
        submittedAt: rental.createdAt,
        updatedAt: rental.updatedAt,
        // Determine completion status based on rental.status
        completionStatus: rental.status === 'completed' ? 'completed' : 'in-progress',
      };

      // Generate claim documents
      try {
        claimDocuments.conditionOfHire = await pdf(createElement(ConditionOfHire, {
          claim: claimData,
          companyDetails
        })).toBlob();

        claimDocuments.noticeOfRightToCancel = await pdf(createElement(NoticeOfRightToCancel, {
          claim: claimData,
          companyDetails
        })).toBlob();

        claimDocuments.hireAgreement = await pdf(createElement(HireAgreement, {
          claim: claimData,
          companyDetails
        })).toBlob();

        if (rental.storageCost) {
          claimDocuments.creditStorageAndRecovery = await pdf(createElement(CreditStorageAndRecovery, {
            claim: claimData,
            companyDetails
          })).toBlob();
        }

        // --- ADDED: CreditHireMitigation Generation ---
        // Generates CreditHireMitigation for all claim rentals.
        // Add a condition here if it's only for specific claim types/statuses.
        claimDocuments.creditHireMitigation = await pdf(createElement(CreditHireMitigation, {
          claim: claimData,
          companyDetails
        })).toBlob();
        console.log("Credit Hire Mitigation generated.");

        // --- ADDED: SatisfactionNotice Generation (Conditional) ---
        // This will now generate if rental.status is 'completed'.
        if (claimData.completionStatus === 'completed') {
          claimDocuments.satisfactionNotice = await pdf(createElement(SatisfactionNotice, {
            claim: claimData,
            companyDetails
          })).toBlob();
          console.log("Satisfaction Notice generated.");
        }

        console.log("Successfully generated claim documents:", Object.keys(claimDocuments));
      } catch (error) {
        console.error("Error generating claim documents:", error);
        toast.error(`Failed to generate one or more claim documents: ${error.message}`);
        throw new Error(`Failed to generate claim documents: ${error.message}`);
      }

      return { agreement: agreementBlob, invoice: invoiceBlob, permit: permitBlob, claimDocuments };
    }

    return { agreement: agreementBlob, invoice: invoiceBlob, permit: permitBlob };
  } catch (error) {
    console.error('Error generating rental documents:', error);
    toast.error('Failed to generate rental documents. Please check data and company settings.');
    throw error;
  }
};