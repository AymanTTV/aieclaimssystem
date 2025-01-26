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

// src/utils/claimDocuments.ts

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
    
    // Only generate hire-related documents for specific claim reasons
    if (['VDHS', 'VDH', 'VDHSPI'].includes(claim.claimReason)) {
      documents.push(await generateConditionOfHire(claim, companyDetails));
      documents.push(await generateCreditHireMitigation(claim, companyDetails));
      documents.push(await generateNoticeOfRightToCancel(claim, companyDetails));
      documents.push(await generateCreditStorageAndRecovery(claim, companyDetails));
      documents.push(await generateHireAgreement(claim, companyDetails));
    }

    // Satisfaction notice - only for completed claims
    if (claim.progress === 'Claim Complete') {
      documents.push(await generateSatisfactionNotice(claim, companyDetails));
    }

    // Upload documents to storage
    const documentUrls = await Promise.all(
      documents.map(async (doc, index) => {
        const filename = getDocumentFilename(index, claimId);
        const storageRef = ref(storage, `claims/${claimId}/${filename}`);
        await uploadBytes(storageRef, doc);
        return getDownloadURL(storageRef);
      })
    );

    // Create document URLs object
    const documentUpdates: Record<string, string> = {};
    
    // Only add document URLs if they were generated
    if (['VDHS', 'VDH', 'VDHSPI'].includes(claim.claimReason)) {
      documentUpdates.conditionOfHire = documentUrls[0];
      documentUpdates.creditHireMitigation = documentUrls[1];
      documentUpdates.noticeOfRightToCancel = documentUrls[2];
      documentUpdates.creditStorageAndRecovery = documentUrls[3];
      documentUpdates.hireAgreement = documentUrls[4];
    }

    // Add satisfaction notice URL if it was generated
    if (claim.progress === 'Claim Complete') {
      documentUpdates.satisfactionNotice = documentUrls[documentUrls.length - 1];
    }

    // Update claim with document URLs
    await updateDoc(doc(db, 'claims', claimId), {
      documents: documentUpdates,
      updatedAt: new Date()
    });

    return documentUpdates;
  } catch (error) {
    console.error('Error generating claim documents:', error);
    throw error;
  }
};


const getDocumentFilename = (index: number, claimId: string): string => {
  const documents = [
    'condition-of-hire',
    'credit-hire-mitigation',
    'notice-of-right-to-cancel',
    'credit-storage-and-recovery',
    'hire-agreement',
    'satisfaction-notice'
  ];
  return `${documents[index]}_${claimId}_${format(new Date(), 'yyyyMMdd')}.pdf`;
};

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
