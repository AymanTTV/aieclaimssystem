// src/utils/claimDocuments.ts

import { pdf } from '@react-pdf/renderer';
import { Claim } from '../types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

export const generateClaimDocuments = async (claimId: string, claim: Claim) => {
  try {
    // Get company details for documents
    const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
    if (!companyDoc.exists()) {
      throw new Error('Company details not found');
    }
    const companyDetails = companyDoc.data();

    // Validate required company details
    if (!companyDetails.fullName || !companyDetails.officialAddress) {
      throw new Error('Incomplete company details');
    }

    const documents = [];
    const claimReasons = Array.isArray(claim.claimReason) ? claim.claimReason : [claim.claimReason];
    
    // VD only - no documents
    if (claimReasons.length === 1 && claimReasons[0] === 'VD') {
      return;
    }

    // Generate Notice of Right to Cancel if H is selected
    if (claimReasons.includes('H')) {
      documents.push({
        name: 'noticeOfRightToCancel',
        blob: await generateNoticeOfRightToCancel(claim, companyDetails)
      });
    }

    // Generate hire-related documents if H is selected
    if (claimReasons.includes('H')) {
      documents.push(
        {
          name: 'conditionOfHire',
          blob: await generateConditionOfHire(claim, companyDetails)
        },
        {
          name: 'hireAgreement',
          blob: await generateHireAgreement(claim, companyDetails)
        }
      );
    }

    // Generate storage documents if S is selected
    if (claimReasons.includes('S')) {
      documents.push({
        name: 'creditStorageAndRecovery',
        blob: await generateCreditStorageAndRecovery(claim, companyDetails)
      });
    }

    // Generate all documents if PI is selected
    if (claimReasons.includes('PI')) {
      documents.push(
        {
          name: 'conditionOfHire',
          blob: await generateConditionOfHire(claim, companyDetails)
        },
        {
          name: 'creditHireMitigation',
          blob: await generateCreditHireMitigation(claim, companyDetails)
        },
        {
          name: 'creditStorageAndRecovery',
          blob: await generateCreditStorageAndRecovery(claim, companyDetails)
        },
        {
          name: 'hireAgreement',
          blob: await generateHireAgreement(claim, companyDetails)
        }
      );
    }

    // Satisfaction notice - only for completed claims
    if (claim.progress === 'Claim Complete') {
      documents.push({
        name: 'satisfactionNotice',
        blob: await generateSatisfactionNotice(claim, companyDetails)
      });
    }

    // Upload documents to storage and get URLs
    const documentUrls: Record<string, string> = {};
    for (const doc of documents) {
      const filename = `${doc.name}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      const storageRef = ref(storage, `claims/${claimId}/${filename}`);
      await uploadBytes(storageRef, doc.blob);
      documentUrls[doc.name] = await getDownloadURL(storageRef);
    }

    // Update claim with document URLs
    await updateDoc(doc(db, 'claims', claimId), {
      documents: documentUrls,
      updatedAt: new Date()
    });

    return documentUrls;
  } catch (error) {
    console.error('Error generating claim documents:', error);
    throw error;
  }
};

// Helper functions to generate individual documents
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
  const element = createElement(HireAgreement, { claim, companyDetails });
  return pdf(element).toBlob();
};

const generateSatisfactionNotice = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  const element = createElement(SatisfactionNotice, { claim, companyDetails });
  return pdf(element).toBlob();
};
