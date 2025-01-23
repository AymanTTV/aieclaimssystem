import { pdf } from '@react-pdf/renderer';
import { Claim } from '../types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { createElement } from 'react';
import { format } from 'date-fns';

// Import PDF components (to be created)
import { 
  ConditionOfHire,
  CreditHireMitigation,
  NoticeOfRightToCancel,
  CreditStorageAndRecovery,
  HireAgreement,
  SatisfactionNotice
} from '../components/pdf/claims';

// In utils/claimDocuments.ts
export const generateClaimDocuments = async (claimId: string, claim: Claim) => {
  try {
    // Get company details for documents
    const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
    const companyDetails = companyDoc.data();

    // Generate all required documents
    const documents = await Promise.all([
      generateConditionOfHire(claim, companyDetails),
      generateCreditHireMitigation(claim, companyDetails),
      generateNoticeOfRightToCancel(claim, companyDetails),
      generateCreditStorageAndRecovery(claim, companyDetails),
      generateHireAgreement(claim, companyDetails),
      // Only generate satisfaction notice if claim is completed
      ...(claim.progress === 'completed' ? [generateSatisfactionNotice(claim, companyDetails)] : [])
    ]);

    // Upload documents to storage
    const documentUrls = await Promise.all(
      documents.map(async (doc, index) => {
        const filename = getDocumentFilename(index, claimId);
        const storageRef = ref(storage, `claims/${claimId}/${filename}`);
        await uploadBytes(storageRef, doc);
        return getDownloadURL(storageRef);
      })
    );

    // Update claim with document URLs
    await updateDoc(doc(db, 'claims', claimId), {
      documents: {
        conditionOfHire: documentUrls[0],
        creditHireMitigation: documentUrls[1],
        noticeOfRightToCancel: documentUrls[2],
        creditStorageAndRecovery: documentUrls[3],
        hireAgreement: documentUrls[4],
        ...(claim.progress === 'completed' ? { satisfactionNotice: documentUrls[5] } : {})
      }
    });

    return documentUrls;
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
  return pdf(createElement(ConditionOfHire, { claim, companyDetails })).toBlob();
};

const generateCreditHireMitigation = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  return pdf(createElement(CreditHireMitigation, { claim, companyDetails })).toBlob();
};

const generateNoticeOfRightToCancel = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  return pdf(createElement(NoticeOfRightToCancel, { claim, companyDetails })).toBlob();
};

const generateCreditStorageAndRecovery = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  return pdf(createElement(CreditStorageAndRecovery, { claim, companyDetails })).toBlob();
};

const generateHireAgreement = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  return pdf(createElement(HireAgreement, { claim, companyDetails })).toBlob();
};

const generateSatisfactionNotice = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  return pdf(createElement(SatisfactionNotice, { claim, companyDetails })).toBlob();
};
