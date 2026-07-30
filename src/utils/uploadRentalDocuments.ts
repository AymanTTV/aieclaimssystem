// src/utils/uploadRentalDocuments.ts

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore'; // Import getDoc
import { db } from '../lib/firebase';

type Blobs = {
  // agreement: Blob; // REMOVED
  agreements: Record<string, Blob>; // CHANGED: Now a map of blobs
  invoice: Blob;
  permit?: Blob;
  claimDocuments?: Record<string, Blob>;
};

export const uploadRentalDocuments = async (
  rentalId: string,
  documents: Blobs
): Promise<{
  // agreementUrl: string; // REMOVED
  agreementUrls: Record<string, string>; // CHANGED: Returns a map of new URLs
  invoiceUrl: string;
  permitUrl?: string;
  claimDocumentUrls?: Record<string, string>;
}> => {
  try {
    console.log('Starting document upload for rental:', rentalId);

    // helper to upload one blob and return its URL
    async function upload(name: string, blob: Blob) {
      const path = `rentals/${rentalId}/${name}.pdf`;
      const storageRef = ref(storage, path);
      const snap = await uploadBytes(storageRef, blob, {
        contentType: 'application/pdf'
      });
      return getDownloadURL(snap.ref);
    }

    // --- Upload agreements ---
    const agreementUrls: Record<string, string> = {};
    if (documents.agreements) {
      for (const [key, blob] of Object.entries(documents.agreements)) {
        if (blob) {
          const url = await upload(key, blob); // key is 'agreement_12345'
          agreementUrls[key] = url;
          console.log(`Agreement "${key}" uploaded:`, url);
        }
      }
    }

    // Upload agreement & invoice
    // const agreementUrl = await upload('agreement', documents.agreement); // REMOVED
    // console.log("Agreement uploaded:", agreementUrl); // REMOVED

    const invoiceUrl = await upload('invoice', documents.invoice);
    console.log('Invoice uploaded:', invoiceUrl);

    // Optionally upload permit
    let permitUrl: string | undefined;
    if (documents.permit) {
      permitUrl = await upload('permit', documents.permit);
      console.log('Permit uploaded:', permitUrl);
    }

    // Upload any claim documents
    let claimDocumentUrls: Record<string, string> | undefined;
    if (documents.claimDocuments) {
      claimDocumentUrls = {};
      for (const [key, blob] of Object.entries(documents.claimDocuments)) {
        if (blob) {
          const url = await upload(key, blob);
          claimDocumentUrls[key] = url;
          console.log(`Claim document "${key}" uploaded:`, url);
        }
      }
    }

    // --- NEW: Merge with existing documents ---
    
    // 1. Get existing document data
    const rentalRef = doc(db, 'rentals', rentalId);
    const rentalSnap = await getDoc(rentalRef);
    const existingDocs = rentalSnap.data()?.documents || {};

    // 2. Build the map of NEWLY uploaded URLs
    const newDocsMap: Record<string, any> = {
      // Only include fields if they were actually uploaded
      ...(Object.keys(agreementUrls).length > 0 && { agreements: agreementUrls }),
      ...(invoiceUrl && { invoice: invoiceUrl }),
      ...(permitUrl && { permit: permitUrl }),
      ...(claimDocumentUrls && { ...claimDocumentUrls }) // Spread claim docs
    };

    // 3. Merge new with old
    let oldAgreements = existingDocs.agreements || {};
    if (typeof oldAgreements === 'string') {
      oldAgreements = { legacy_agreement: oldAgreements };
    }

    // 3. Merge new with old
    const mergedDocsMap = {
      ...existingDocs, 
      ...newDocsMap, 
      agreements: { 
        ...oldAgreements,
        ...(newDocsMap.agreements || {})
      }
    };

    // 4. Write back the MERGED map
    await updateDoc(rentalRef, {
      documents: mergedDocsMap,
      updatedAt: new Date()
    });
    console.log('Rental document URLs *merged* in Firestore');

    return {
      // agreementUrl, // REMOVED
      agreementUrls, // CHANGED
      invoiceUrl,
      ...(permitUrl && { permitUrl }),
      ...(claimDocumentUrls && { claimDocumentUrls })
    };
  } catch (error) {
    console.error('Error uploading rental documents:', error);
    throw new Error('Failed to upload rental documents');
  }
};