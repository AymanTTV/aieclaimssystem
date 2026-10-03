// src/utils/generateRentalDocuments.ts

import { pdf } from '@react-pdf/renderer';
import { RentalAgreement, RentalInvoice } from '../components/pdf';
import { Rental, Vehicle, Customer } from '../types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createElement } from 'react';
import toast from 'react-hot-toast';
import { ensureValidDate } from './dateHelpers'; // Ensure this is imported
import { resolveCustomerOrUserSignature } from './signatureStorage';
import { getHireCommencementDate, formatExecutionDateTime } from './legalDocumentUtils';

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
import { AIE_CLAIMS_COMPANY_DETAILS, getCompanyBrandingForPdf } from './legalDocumentUtils';
import { getAvailableCompanyEntities } from './entityBranding';
import { getEffectiveBankAccounts, CompanyBankAccount } from './bankAccountAllocation';
import { resolveCompanyLogo, AIE_SKYLINE_LOGO_BASE64 } from './companyLogoResolver';

type PeriodOverride = { start: Date; end: Date };

// ✅ UPDATE: Add includeImages, entityKey, and docEntityMap to Options
type Options = { 
  periodOverride?: PeriodOverride; 
  includeImages?: boolean; 
  entityKey?: string;
  docEntityMap?: Record<string, string>;
  companyDetails?: any;
};

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

    // Get company details with resilient fallbacks
    let companyDetails: any = {
      fullName: 'AIE Skyline Limited',
      tradingName: 'AIE Skyline',
      officialAddress: 'Unit 4, Skyline Business Park, London',
      phone: '020 1234 5678',
      email: 'info@aieskyline.co.uk',
      website: '',
      companyNumber: '',
      vatNumber: '',
      logoUrl: AIE_SKYLINE_LOGO_BASE64,
    };
    try {
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (companyDoc.exists()) {
        const data = companyDoc.data() || {};
        companyDetails = {
          ...companyDetails,
          ...data,
          fullName: data.fullName || data.tradingName || companyDetails.fullName,
          officialAddress: data.officialAddress || data.address || companyDetails.officialAddress,
          phone: data.phone || data.telephone || companyDetails.phone,
          email: data.email || companyDetails.email,
        };
      }
    } catch (e) {
      console.warn('Could not fetch company details, using defaults:', e);
    }

    // ── Incorporate Rental's Corporate Entity Profile ──
    const targetEntityKey =
      options?.entityKey ||
      rental.corporateEntityKey ||
      (rental.type === 'claim' ? 'aie_claims' : 'aie_skyline');
    const availableEntities = getAvailableCompanyEntities(companyDetails);
    const matchedEntity =
      availableEntities.find(
        (e) =>
          e.key === targetEntityKey ||
          e.id === targetEntityKey ||
          (rental.corporateEntityName &&
            (e.fullName.toLowerCase() === rental.corporateEntityName.toLowerCase() ||
             e.tradingName.toLowerCase() === rental.corporateEntityName.toLowerCase())) ||
          (Boolean(targetEntityKey) && targetEntityKey.includes('sayarah') && e.key.includes('sayarah'))
      ) || availableEntities[0];

    if (matchedEntity) {
      const resolvedLogo = resolveCompanyLogo(matchedEntity, matchedEntity.fullName);
      companyDetails = {
        ...companyDetails,
        entityKey: matchedEntity.key,
        fullName: matchedEntity.fullName,
        tradingName: matchedEntity.tradingName,
        registrationNumber: matchedEntity.registrationNumber || companyDetails.registrationNumber,
        vatNumber: matchedEntity.vatNumber || companyDetails.vatNumber,
        officialAddress: matchedEntity.officialAddress || companyDetails.officialAddress,
        phone: matchedEntity.phone || companyDetails.phone,
        email: matchedEntity.email || companyDetails.email,
        website: matchedEntity.website || companyDetails.website,
        logoUrl: resolvedLogo,
        headerDisclaimer: matchedEntity.headerDisclaimer || companyDetails.headerDisclaimer,
        footerDisclaimer: matchedEntity.footerDisclaimer || companyDetails.footerDisclaimer,
        page1Entity: { ...matchedEntity, logoUrl: resolvedLogo },
        page2Entity: { ...matchedEntity, logoUrl: resolvedLogo },
        page3Entity: { ...matchedEntity, logoUrl: resolvedLogo },
      };
    }

    // ── Incorporate Rental's Assigned Bank Account ──
    const availableBanks = getEffectiveBankAccounts(companyDetails);
    let matchedBank: CompanyBankAccount | undefined;

    if (rental.bankAccountId) {
      matchedBank = availableBanks.find((b) => b.id === rental.bankAccountId);
    }
    if (!matchedBank && rental.bankAccountDetails?.accountNumber) {
      matchedBank =
        availableBanks.find(
          (b) => b.accountNumber === rental.bankAccountDetails?.accountNumber
        ) || {
          id: 'rental_assigned_bank',
          bankName: rental.bankAccountDetails.bankName,
          accountName: rental.bankAccountDetails.accountName,
          accountNumber: rental.bankAccountDetails.accountNumber,
          sortCode: rental.bankAccountDetails.sortCode,
          iban: rental.bankAccountDetails.iban,
          bic: rental.bankAccountDetails.bic,
        };
    }
    if (!matchedBank) {
      matchedBank =
        rental.type === 'claim'
          ? availableBanks.find((b) => b.id.includes('claims') || b.id.includes('natwest')) ||
            availableBanks[0]
          : availableBanks.find(
              (b) =>
                b.isDefault ||
                b.id.includes('lloyds') ||
                b.accountNumber === '30513162'
            ) || availableBanks[0];
    }

    if (matchedBank) {
      companyDetails = {
        ...companyDetails,
        bankName: matchedBank.bankName,
        accountName: matchedBank.accountName,
        accountNumber: matchedBank.accountNumber,
        sortCode: matchedBank.sortCode,
        iban: matchedBank.iban,
        bic: matchedBank.bic,
        selectedBank: matchedBank,
      };
    }

    // Ensure dates are valid Date objects (keep your normalization)
    const validatedRental: Rental = {
      ...rental,
      corporateEntityKey: targetEntityKey,
      corporateEntityName: matchedEntity?.fullName || rental.corporateEntityName,
      corporateEntityLogo: matchedEntity?.logoUrl || rental.corporateEntityLogo,
      bankAccountId: matchedBank?.id || rental.bankAccountId,
      bankAccountDetails: matchedBank
        ? {
            bankName: matchedBank.bankName,
            accountName: matchedBank.accountName,
            accountNumber: matchedBank.accountNumber,
            sortCode: matchedBank.sortCode,
            iban: matchedBank.iban,
            bic: matchedBank.bic,
          }
        : rental.bankAccountDetails,
      startDate: ensureValidDate(rental.startDate) || new Date(),
      endDate: ensureValidDate(rental.endDate) || new Date(),
      createdAt: ensureValidDate(rental.createdAt) || new Date(),
      updatedAt: ensureValidDate(rental.updatedAt) || new Date(),
      // Handle substitutions specifically to ensure their dates are valid too
      hireSubstitutionDetails:
        rental.hireSubstitutionDetails?.map((sub) => ({
          ...sub,
          givenAt: ensureValidDate(sub.givenAt) || new Date(),
          expectedReturnAt: ensureValidDate(sub.expectedReturnAt) || new Date(),
        })) || [],
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

    // ── Auto-Populate Saved Signature from Customer Profile / IndexedDB / Database ──
    const savedSignature = await resolveCustomerOrUserSignature({
      customerId: customer.id || rental.customerId,
      customer,
      rental,
    });

    if (savedSignature) {
      if (!effectiveAgreementRental.signature) {
        effectiveAgreementRental.signature = savedSignature;
      }
      if (!effectiveAgreementRental.customerSignature) {
        effectiveAgreementRental.customerSignature = savedSignature;
      }
      if (!validatedRental.signature) {
        validatedRental.signature = savedSignature;
      }
      if (!validatedRental.customerSignature) {
        validatedRental.customerSignature = savedSignature;
      }
      if (!customer.signature) {
        customer.signature = savedSignature;
      }

      // Automatically backdate execution timestamp to match exact hire Start Date & Start Time
      const execDate = getHireCommencementDate(validatedRental);
      const execTs = formatExecutionDateTime(validatedRental, 'dd/MM/yyyy HH:mm');

      effectiveAgreementRental.isSigned = true;
      effectiveAgreementRental.documentStatus = 'Legally Signed & Verified';
      effectiveAgreementRental.signedAt = execDate;
      effectiveAgreementRental.customerSignatureDate = execDate;
      effectiveAgreementRental.signatureTimestamp = execTs;

      validatedRental.isSigned = true;
      validatedRental.documentStatus = 'Legally Signed & Verified';
      validatedRental.signedAt = execDate;
      validatedRental.customerSignatureDate = execDate;
      validatedRental.signatureTimestamp = execTs;

      // Update Firestore in background if document status or signature needs persistence
      if (rental.id && rental.id !== 'draft') {
        updateDoc(doc(db, 'rentals', rental.id), {
          signature: savedSignature,
          customerSignature: savedSignature,
          isSigned: true,
          documentStatus: 'Legally Signed & Verified',
          signedAt: execDate,
          customerSignatureDate: execDate,
          signatureTimestamp: execTs,
          updatedAt: new Date(),
        }).catch((err) => console.warn('[generateRentalDocuments] Background rental signature sync note:', err));
      }

      if (customer?.id) {
        updateDoc(doc(db, 'customers', customer.id), {
          signature: savedSignature,
          documentStatus: 'Legally Signed & Verified',
          signedAt: execDate,
          signatureTimestamp: execTs,
          updatedAt: new Date(),
        }).catch((err) => console.warn('[generateRentalDocuments] Background customer signature sync note:', err));
      }
    }

    // Generate Hire Agreement PDF (uses possibly overridden dates)
    const agreementBlob = await pdf(createElement(RentalAgreement, {
      rental: effectiveAgreementRental,
      vehicle,
      customer,
      companyDetails,
      // ✅ UPDATE: Pass the option, default to true if undefined
      includeImages: options?.includeImages ?? true,
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

    // Inspect assigned Rental / Hire Type:
    // a) Standard Weekly / Daily Hire: rawRentalType === 'weekly' || rawRentalType === 'daily'
    // b) Claim Hire (Credit Hire / GTA): rawRentalType === 'claim' || rawReason === 'claim' || rawReason === 'credit-hire' || rawReason === 'gta' || rawCustomerType === 'claim' || Boolean(rental.claimId)
    const rawCustomerType = String(customer?.type || (rental as any)?.customerType || '').trim().toLowerCase();
    const rawRentalType = String(rental.type || (rental as any).rentalType || (rental as any).billingType || '').trim().toLowerCase();
    const rawReason = String(rental.reason || '').trim().toLowerCase();

    const isClaimRental = Boolean(
      rawRentalType === 'claim' ||
      rawReason === 'claim' ||
      rawReason === 'credit-hire' ||
      rawReason === 'gta' ||
      rawCustomerType === 'claim' ||
      Boolean(rental.claimId)
    );

    if (isClaimRental) {
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
          firstName: customer.firstName,
          middleName: customer.middleName,
          lastName: customer.lastName,
          phone: customer.mobile,
          email: customer.email,
          dateOfBirth: customer.dateOfBirth,
          driverLicenseNumber: customer.driverLicenseNumber,
          licenseExpiry: customer.licenseExpiry,
          address: customer.address,
          buildingFlat: customer.buildingFlat,
          streetName: customer.streetName,
          townCity: customer.townCity,
          postcode: customer.postcode,
          country: customer.country,
          type: customer.type,
          signature: savedSignature || rental.signature || customer.signature || '',
        },
        clientVehicle: {
          make: vehicle.make,
          model: vehicle.model,
          registration: vehicle.registrationNumber,
          registrationNumber: vehicle.registrationNumber,
          documents: {},
          motExpiry: (vehicle as any).motExpiry,
          roadTaxExpiry: (vehicle as any).roadTaxExpiry,
        },
        vehicle: {
          make: vehicle.make,
          model: vehicle.model,
          registration: vehicle.registrationNumber,
          registrationNumber: vehicle.registrationNumber,
          isClaimantVehicle: false,
        },
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleRegistration: vehicle.registrationNumber,
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
        rental: {
          ...rental,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleRegistration: vehicle.registrationNumber,
        },
        rentalAgreementNumber: rental.rentalAgreementNumber,
        paidAmount: rental.paidAmount || 0,
        includeVAT: rental.includeVAT,
        deliveryChargeIncludeVAT: rental.deliveryChargeIncludeVAT,
        collectionChargeIncludeVAT: rental.collectionChargeIncludeVAT,
        insurancePerDayIncludeVAT: rental.insurancePerDayIncludeVAT,
        includeStorageVAT: rental.includeStorageVAT,
        includeRecoveryCostVAT: rental.includeRecoveryCostVAT,
      };

      const resolveDocBranding = (docKey: string, defaultKey: 'aie_skyline' | 'aie_claims' | 'skyline_cabs' = 'aie_claims') => {
        const chosenKey = (options?.docEntityMap?.[docKey] || options?.entityKey || rental.corporateEntityKey || defaultKey) as any;
        const branding = getCompanyBrandingForPdf({ ...companyDetails, entityKey: chosenKey }, chosenKey);
        return {
          ...companyDetails,
          ...branding,
          entityKey: branding.entityKey,
          fullName: branding.companyName,
          officialAddress: branding.companyAddress,
          phone: branding.companyPhone,
          email: branding.companyEmail,
          website: branding.website || companyDetails.website,
          logoUrl: branding.companyLogo,
          footerDisclaimer: branding.footerText,
        };
      };

      const claimCompanyDetails = resolveDocBranding('claim', 'aie_claims');

      try {
        const conditionCompanyDetails = resolveDocBranding('conditionOfHire', 'aie_claims');
        claimDocuments.conditionOfHire = await pdf(createElement(ConditionOfHire, {
          claim: claimData,
          companyDetails: conditionCompanyDetails
        })).toBlob();

        const cancelCompanyDetails = resolveDocBranding('noticeOfRightToCancel', 'aie_claims');
        claimDocuments.noticeOfRightToCancel = await pdf(createElement(NoticeOfRightToCancel, {
          claim: claimData,
          companyDetails: cancelCompanyDetails
        })).toBlob();

        // Requirement 1 & 3: Hire Agreement default entity is AIE Skyline Limited (aie_skyline)
        const hireAgreementCompanyDetails = resolveDocBranding('hireAgreement', 'aie_skyline');

        claimDocuments.hireAgreement = await pdf(createElement(HireAgreement, {
          claim: claimData,
          companyDetails: hireAgreementCompanyDetails
        })).toBlob();
        claimDocuments.claimHireAgreement = claimDocuments.hireAgreement;

        const storageCompanyDetails = resolveDocBranding('creditStorageAndRecovery', 'aie_claims');
        claimDocuments.creditStorageAndRecovery = await pdf(createElement(CreditStorageAndRecovery, {
          claim: claimData,
          companyDetails: storageCompanyDetails
        })).toBlob();

        // Always generate mitigation with dynamic branding
        const mitigationCompanyDetails = resolveDocBranding('creditHireMitigation', 'aie_claims');
        claimDocuments.creditHireMitigation = await pdf(createElement(CreditHireMitigation, {
          claim: claimData,
          companyDetails: mitigationCompanyDetails
        })).toBlob();

        // Always generate satisfaction notice for selectable claim documents bundle
        try {
          claimDocuments.satisfactionNotice = await pdf(createElement(SatisfactionNotice, {
            claim: claimData,
            companyDetails: claimCompanyDetails
          })).toBlob();
        } catch (snErr) {
          console.warn('Could not generate satisfactionNotice for claim:', snErr);
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