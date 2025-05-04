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

    // VD only - no documents
    if (claimReasons.length === 1 && claimReasons[0] === 'VD') {
      await updateDoc(doc(db, 'claims', claimId), {
        documents: {},
        updatedAt: new Date()
      });
      return;
    }

    // Decide which documents to generate
    const documentsToGenerate: { name: string; generator: () => Promise<Blob> }[] = [];

    // --- Hire related ---
    if (claimReasons.includes('H')) {
      documentsToGenerate.push(
        { name: 'noticeOfRightToCancel', generator: () => generateNoticeOfRightToCancel(claim, companyDetails) },
        { name: 'conditionOfHire', generator: () => generateConditionOfHire(claim, companyDetails) },
        { name: 'hireAgreement', generator: () => generateHireAgreement(claim, companyDetails) }
      );
    }

    // --- Storage related ---
    if (claimReasons.includes('S')) {
      documentsToGenerate.push({
        name: 'creditStorageAndRecovery',
        generator: () => generateCreditStorageAndRecovery(claim, companyDetails)
      });
    }

    // --- PI related (full pack) ---
    if (claimReasons.includes('PI')) {
      documentsToGenerate.push(
        { name: 'conditionOfHire', generator: () => generateConditionOfHire(claim, companyDetails) },
        { name: 'creditHireMitigation', generator: () => generateCreditHireMitigation(claim, companyDetails) },
        { name: 'creditStorageAndRecovery', generator: () => generateCreditStorageAndRecovery(claim, companyDetails) },
        { name: 'hireAgreement', generator: () => generateHireAgreement(claim, companyDetails) }
      );
    }

    // --- Claim Completed ---
    if (claim.progress === 'Claim Complete') {
      documentsToGenerate.push({
        name: 'satisfactionNotice',
        generator: () => generateSatisfactionNotice(claim, companyDetails)
      });
    }

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

    // --- Update Firestore ---
    await updateDoc(claimDocRef, {
      documents: documentUrls,
      updatedAt: new Date()
    });

    return documentUrls;
  } catch (error) {
    console.error('Error generating claim documents:', error);
    throw error;
  }
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
  const element = createElement(HireAgreement, { claim, companyDetails });
  return pdf(element).toBlob();
};

const generateSatisfactionNotice = async (claim: Claim, companyDetails: any): Promise<Blob> => {
  const element = createElement(SatisfactionNotice, { claim, companyDetails });
  return pdf(element).toBlob();
};
