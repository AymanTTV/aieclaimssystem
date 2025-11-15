// src/utils/generateRentalDocuments.ts

import { pdf } from '@react-pdf/renderer';
import { RentalAgreement, RentalInvoice } from '../components/pdf';
import { Rental, Vehicle, Customer } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createElement } from 'react';
import toast from 'react-hot-toast';

// Claims bundle (your existing set)
import {
  ConditionOfHire,
  CreditHireMitigation,
  NoticeOfRightToCancel,
  CreditStorageAndRecovery,
  HireAgreement,
  SatisfactionNotice
} from '../components/pdf/claims';

// Permit (your existing letter)
import { ParkingPermitLetter } from '../components/pdf/ParkingPermitLetter';

type PeriodOverride = { start: Date; end: Date };
type Options = { periodOverride?: PeriodOverride };

export const generateRentalDocuments = async (
  rental: Rental,
  vehicle: Vehicle,
  customer: Customer,
  options?: Options
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

    // Validate company details (mirror your checks)
    if (!companyDetails.fullName || !companyDetails.officialAddress) {
      throw new Error('Incomplete company details');
    }

    // Ensure dates are valid Date objects (keep your normalization)
    const validatedRental: Rental = {
      ...rental,
      startDate: new Date(rental.startDate),
      endDate: new Date(rental.endDate),
      createdAt: new Date(rental.createdAt),
      updatedAt: new Date(rental.updatedAt)
    };

    // ---- Key addition: build an "effective rental" for the Agreement only ----
    // We DO NOT mutate Firestore; this is just for PDF rendering.
    const effectiveAgreementRental: Rental =
      options?.periodOverride
        ? {
            ...validatedRental,
            startDate: new Date(options.periodOverride.start),
            endDate: new Date(options.periodOverride.end),
          }
        : validatedRental;

    // Generate Hire Agreement PDF (uses possibly overridden dates)
    const agreementBlob = await pdf(createElement(RentalAgreement, {
      rental: effectiveAgreementRental,
      vehicle,
      customer,
      companyDetails,
      // Optional hint props, safe if your component ignores them:
      agreementPeriod: options?.periodOverride
        ? { start: new Date(options.periodOverride.start), end: new Date(options.periodOverride.end) }
        : undefined,
      periodOverride: options?.periodOverride
        ? { start: new Date(options.periodOverride.start), end: new Date(options.periodOverride.end) }
        : undefined
    })).toBlob();

    // Parking Permit (kept on original period)
    const permitBlob = await pdf(createElement(ParkingPermitLetter, {
      rental: validatedRental,
      vehicle,
      customer,
      companyDetails
    })).toBlob();

    // Invoice (kept on original period; add optional meta if your template wants it)
    const invoiceBlob = await pdf(createElement(RentalInvoice, {
      rental: validatedRental,
      vehicle,
      customer,
      companyDetails,
      invoiceMeta: options?.periodOverride
        ? { periodStart: new Date(options.periodOverride.start), periodEnd: new Date(options.periodOverride.end) }
        : undefined
    })).toBlob();

    if (!agreementBlob || !invoiceBlob) {
      throw new Error('Failed to generate PDF documents');
    }

    // Claims bundle (unchanged, uses full rental period)
    if (rental.type === 'claim' || rental.reason === 'claim') {
      const claimDocuments: Record<string, Blob> = {};

      // Calculate days of hire
      const startDate = new Date(rental.startDate);
      const endDate = new Date(rental.endDate);
      const daysOfHire = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Assemble claimData like your current flow
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
          motExpiry: (vehicle as any).motExpiry,
          roadTaxExpiry: (vehicle as any).roadTaxExpiry,
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
          daysOfHire,
          claimRate: (vehicle as any).claimRentalPrice || 340,
          deliveryCharge: rental.deliveryCharge || 0,
          collectionCharge: rental.collectionCharge || 0,
          insurancePerDay: rental.insurancePerDay || 0,
          totalCost: (rental as any).cost,
          vehicle: {
            make: vehicle.make,
            model: vehicle.model,
            registration: vehicle.registrationNumber,
            claimRate: (vehicle as any).claimRentalPrice || 340,
          },
        },
        storage: rental.storageCost ? {
          enabled: true,
          startDate: (rental as any).storageStartDate,
          endDate: (rental as any).storageEndDate,
          costPerDay: (rental as any).storageCostPerDay || 0,
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
        caseProgress: rental.status === 'completed' ? 'Completed' : 'Awaiting',
        progress: 'Your Claim Has Started',
        progressHistory: [],
        createdBy: rental.createdBy,
        submittedAt: rental.createdAt,
        updatedAt: rental.updatedAt,
        completionStatus: rental.status === 'completed' ? 'completed' : 'in-progress',
      };

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

        // Always generate mitigation
        claimDocuments.creditHireMitigation = await pdf(createElement(CreditHireMitigation, {
          claim: claimData,
          companyDetails
        })).toBlob();

        // Generate satisfaction when completed
        if (claimData.completionStatus === 'completed') {
          claimDocuments.satisfactionNotice = await pdf(createElement(SatisfactionNotice, {
            claim: claimData,
            companyDetails
          })).toBlob();
        }
      } catch (error: any) {
        console.error('Error generating claim documents:', error);
        toast.error(`Failed to generate one or more claim documents: ${error.message}`);
        throw new Error(`Failed to generate claim documents: ${error.message}`);
      }

      return { agreement: agreementBlob, invoice: invoiceBlob, permit: permitBlob, claimDocuments };
    }

    // Non-claim path
    return { agreement: agreementBlob, invoice: invoiceBlob, permit: permitBlob };
  } catch (error) {
    console.error('Error generating rental documents:', error);
    toast.error('Failed to generate rental documents. Please check data and company settings.');
    throw error;
  }
};
