// src/utils/claimDocuments.ts

import { pdf } from '@react-pdf/renderer';
import { Claim } from '../types';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { createElement } from 'react';
import { format } from 'date-fns';

// Import PDF components
import { 
  ConditionOfHire,
  CreditHireMitigation,
  NoticeOfRightToCancel,
  CreditStorageAndRecovery,
  HireAgreement,
  SatisfactionNotice
} from '../components/pdf/claims';
import { getCompanyBrandingForPdf, getHireCommencementDate, formatExecutionDateTime } from './legalDocumentUtils';
import { resolveCustomerOrUserSignature } from './signatureStorage';
import { resolveCompanyLogo, AIE_CLAIMS_LOGO_BASE64 } from './companyLogoResolver';

export const generateClaimDocuments = async (claimId: string, claim: Claim) => {
  try {
    // Fetch company details
    const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
    if (!companyDoc.exists()) throw new Error('Company details not found');

    const companyDetails = companyDoc.data();
    if (!companyDetails.fullName || !companyDetails.officialAddress) {
      throw new Error('Incomplete company details');
    }

    const claimReasons = Array.isArray(claim.claimReason) ? claim.claimReason : [claim.claimReason];

    // VD only - no credit hire documents required
    if (claimReasons.length === 1 && claimReasons[0] === 'VD') {
      await updateDoc(doc(db, 'claims', claimId), {
        documents: {},
        updatedAt: new Date()
      });
      return {};
    }

    // ── Auto-Populate Saved Signature from Customer Profile / IndexedDB / Database ──
    const savedSignature = await resolveCustomerOrUserSignature({
      customerId: claim.customerId || claim.clientInfo?.id,
      customer: claim.customer || claim.clientInfo,
      claim,
    });

    if (savedSignature) {
      if (!claim.clientInfo) claim.clientInfo = {} as any;
      if (!claim.clientInfo.signature) {
        claim.clientInfo.signature = savedSignature;
      }
      if (claim.registerKeeper && !claim.registerKeeper.signature) {
        claim.registerKeeper.signature = savedSignature;
      }
    }

    // ── AUTOMATED DOCUMENT PACK GENERATION: ALL 6 LEGAL CLAIM DOCUMENTS ──
    // When generating documents for Claims (Credit Hire / GTA):
    // 1. Credit Hire Agreement
    // 2. Credit Hire Mitigation Statement
    // 3. Credit Storage and Recovery Notice
    // 4. Right to Cancel Notice
    // 5. Condition of Hire Report
    // 6. Satisfaction Notice (Generated upon vehicle check-in/return or completion)
    const documentsToGenerate: { name: string; generator: () => Promise<Blob> }[] = [
      { name: 'hireAgreement', generator: () => generateHireAgreement(claim, companyDetails) },
      { name: 'creditHireMitigation', generator: () => generateCreditHireMitigation(claim, companyDetails) },
      { name: 'creditStorageAndRecovery', generator: () => generateCreditStorageAndRecovery(claim, companyDetails) },
      { name: 'noticeOfRightToCancel', generator: () => generateNoticeOfRightToCancel(claim, companyDetails) },
      { name: 'conditionOfHire', generator: () => generateConditionOfHire(claim, companyDetails) },
    ];

    // Check if vehicle check-in/return has occurred or claim is complete/in check-in state
    const isVehicleReturnedOrCompleted = Boolean(
      claim.progress === 'Claim Complete' ||
      claim.completionStatus === 'completed' ||
      (claim as any).status === 'completed' ||
      (claim as any).returnCondition ||
      (claim as any).rental?.returnCondition ||
      (claim as any).checkInDate ||
      (claim as any).returnedAt ||
      (claim as any).isReturned
    );

    // Always generate satisfaction notice for the full claim bundle so it is ready upon vehicle check-in/return
    documentsToGenerate.push({
      name: 'satisfactionNotice',
      generator: () => generateSatisfactionNotice(claim, companyDetails)
    });

    // --- Get previously stored documents ---
    const claimDocRef = doc(db, 'claims', claimId);
    const claimSnapshot = await getDoc(claimDocRef);
    const existingDocuments: Record<string, string> = claimSnapshot.data()?.documents || {};

    // --- Determine documents to remove ---
    const requiredDocNames = documentsToGenerate.map(d => d.name);
    const documentsToDelete = Object.keys(existingDocuments).filter(name => !requiredDocNames.includes(name));

    // --- Delete unused files from storage ---
    for (const docName of documentsToDelete) {
      const filenamePattern = `${docName}_`;
      const storageRef = ref(storage, `claims/${claimId}/`);
      const fileToDeleteRef = ref(storage, `claims/${claimId}/${filenamePattern}${format(new Date(), 'yyyyMMdd')}.pdf`);
      try {
        await deleteObject(fileToDeleteRef);
      } catch (err) {
        console.warn(`Could not delete old document ${docName}:`, err);
      }
    }

    // --- Generate new documents ---
    const documentUrls: Record<string, string> = {};
    for (const docItem of documentsToGenerate) {
      const blob = await docItem.generator();
      const filename = `${docItem.name}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      const storageRef = ref(storage, `claims/${claimId}/${filename}`);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      documentUrls[docItem.name] = url;
    }

    if (documentUrls.hireAgreement) {
      documentUrls.creditHireAgreement = documentUrls.hireAgreement;
      documentUrls.claimHireAgreement = documentUrls.hireAgreement;
    }

    // --- Update Firestore ---
    const execDate = getHireCommencementDate(claim);
    const execTs = formatExecutionDateTime(claim, 'dd/MM/yyyy HH:mm');
    const updatePayload: any = {
      documents: documentUrls,
      updatedAt: new Date(),
    };
    if (savedSignature) {
      updatePayload['clientInfo.signature'] = savedSignature;
      updatePayload.documentStatus = 'Legally Signed & Verified';
      updatePayload.documentsStatus = 'Legally Signed & Verified';
      updatePayload.isSigned = true;
      updatePayload.signedAt = execDate;
      updatePayload.signatureTimestamp = execTs;
    }
    await updateDoc(claimDocRef, updatePayload);

    return documentUrls;
  } catch (error) {
    console.error('Error generating claim documents:', error);
    throw error;
  }
};

/**
 * Automatically compiles and bundles ALL 6 legal claim documents as Blobs:
 * 1. Credit Hire Agreement
 * 2. Credit Hire Mitigation Statement
 * 3. Credit Storage and Recovery Notice
 * 4. Right to Cancel Notice
 * 5. Condition of Hire Report
 * 6. Satisfaction Notice (Generated upon vehicle check-in/return or completion)
 */
export const generateAllClaimDocumentBlobs = async (
  claim: Claim,
  companyDetails?: any
): Promise<{
  hireAgreement: Blob;
  creditHireAgreement: Blob;
  creditHireMitigation: Blob;
  creditStorageAndRecovery: Blob;
  noticeOfRightToCancel: Blob;
  conditionOfHire: Blob;
  satisfactionNotice: Blob;
}> => {
  // Force query of active saved templates from Dynamic T&C Mapping Engine in real-time
  let details = companyDetails;
  try {
    const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
    if (companyDoc.exists()) {
      const liveData = companyDoc.data() || {};
      details = {
        ...liveData,
        ...(companyDetails || {}),
        dynamicTermsTemplates: liveData.dynamicTermsTemplates !== undefined
          ? liveData.dynamicTermsTemplates
          : companyDetails?.dynamicTermsTemplates,
      };
    }
  } catch (e) {
    console.warn('Could not fetch real-time companySettings in generateAllClaimDocumentBlobs:', e);
  }

  if (!details) {
    details = {
      fullName: 'AIE Claims LTD',
      tradingName: 'AIE Claims Ltd.',
      officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
      phone: '+442080505337',
      email: 'claims@aieclaims.co.uk',
      website: 'www.aieclaims.co.uk',
      logoUrl: AIE_CLAIMS_LOGO_BASE64,
    };
  }

  const resolvedClaimsLogo = resolveCompanyLogo(
    {
      key: 'aie_claims',
      fullName: details.fullName || 'AIE Claims LTD',
      tradingName: details.tradingName,
      logoUrl: details.logoUrl,
    },
    details.fullName || 'AIE Claims LTD'
  );

  details = {
    ...details,
    logoUrl: resolvedClaimsLogo,
    companyLogo: resolvedClaimsLogo,
  };

  // Auto-populate saved signature from IndexedDB / database if client signature is not yet set
  const savedSignature = await resolveCustomerOrUserSignature({
    customerId: claim.customerId || claim.clientInfo?.id,
    customer: claim.customer || claim.clientInfo,
    claim,
  });

  if (savedSignature) {
    if (!claim.clientInfo) claim.clientInfo = {} as any;
    if (!claim.clientInfo.signature) {
      claim.clientInfo.signature = savedSignature;
    }
    if (claim.registerKeeper && !claim.registerKeeper.signature) {
      claim.registerKeeper.signature = savedSignature;
    }
  }

  const [
    hireAgreement,
    creditHireMitigation,
    creditStorageAndRecovery,
    noticeOfRightToCancel,
    conditionOfHire,
    satisfactionNotice,
  ] = await Promise.all([
    generateHireAgreement(claim, details),
    generateCreditHireMitigation(claim, details),
    generateCreditStorageAndRecovery(claim, details),
    generateNoticeOfRightToCancel(claim, details),
    generateConditionOfHire(claim, details),
    generateSatisfactionNotice(claim, details),
  ]);

  return {
    hireAgreement,
    creditHireAgreement: hireAgreement,
    creditHireMitigation,
    creditStorageAndRecovery,
    noticeOfRightToCancel,
    conditionOfHire,
    satisfactionNotice,
  };
};

// Helper functions
const generateConditionOfHire = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  const element = createElement(ConditionOfHire, { claim, companyDetails });
  return pdf(element).toBlob();
};

const generateCreditHireMitigation = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  const element = createElement(CreditHireMitigation, { claim, companyDetails });
  return pdf(element).toBlob();
};

const generateNoticeOfRightToCancel = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  const element = createElement(NoticeOfRightToCancel, { claim, companyDetails });
  return pdf(element).toBlob();
};

const generateCreditStorageAndRecovery = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  const element = createElement(CreditStorageAndRecovery, { claim, companyDetails });
  return pdf(element).toBlob();
};

const generateHireAgreement = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  // Requirement 1 & 3: Hire Agreement default entity is AIE Skyline Limited (aie_skyline)
  const branding = getCompanyBrandingForPdf(companyDetails, 'aie_skyline');
  const hireAgreementCompanyDetails = {
    ...companyDetails,
    ...branding,
    entityKey: branding.entityKey,
    fullName: branding.companyName,
    officialAddress: branding.companyAddress,
    phone: branding.companyPhone,
    email: branding.companyEmail,
    logoUrl: branding.companyLogo,
    footerDisclaimer: branding.footerText,
  };
  const element = createElement(HireAgreement, { claim, companyDetails: hireAgreementCompanyDetails });
  return pdf(element).toBlob();
};

const generateSatisfactionNotice = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  const element = createElement(SatisfactionNotice, { claim, companyDetails });
  return pdf(element).toBlob();
};
