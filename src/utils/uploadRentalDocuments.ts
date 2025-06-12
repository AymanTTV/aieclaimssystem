// src/utils/uploadRentalDocuments.ts

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type Blobs = {
  agreement: Blob;
  invoice: Blob;
  permit?: Blob;
  claimDocuments?: Record<string, Blob>;
};

export const uploadRentalDocuments = async (
  rentalId: string,
  documents: Blobs
): Promise<{
  agreementUrl: string;
  invoiceUrl: string;
  permitUrl?: string;
  claimDocumentUrls?: Record<string, string>;
}> => {
  try {
    console.log("Starting document upload for rental:", rentalId);

    // helper to upload one blob and return its URL
    async function upload(name: string, blob: Blob) {
      const path = `rentals/${rentalId}/${name}.pdf`;
      const storageRef = ref(storage, path);
      const snap = await uploadBytes(storageRef, blob, {
        contentType: 'application/pdf'
      });
      return getDownloadURL(snap.ref);
    }

    // Upload agreement & invoice
    const agreementUrl = await upload('agreement', documents.agreement);
    console.log("Agreement uploaded:", agreementUrl);

    const invoiceUrl = await upload('invoice', documents.invoice);
    console.log("Invoice uploaded:", invoiceUrl);

    // Optionally upload permit
    let permitUrl: string | undefined;
    if (documents.permit) {
      permitUrl = await upload('permit', documents.permit);
      console.log("Permit uploaded:", permitUrl);
    }

    // Upload any claim documents
    let claimDocumentUrls: Record<string, string> | undefined;
    if (documents.claimDocuments) {
      claimDocumentUrls = {};
      for (const [key, blob] of Object.entries(documents.claimDocuments)) {
        const url = await upload(key, blob);
        claimDocumentUrls[key] = url;
        console.log(`Claim document "${key}" uploaded:`, url);
      }
    }

    // Build the Firestore `documents` map
    const docsMap: Record<string, string> = {
      agreement: agreementUrl,
      invoice: invoiceUrl,
      ...(permitUrl && { permit: permitUrl }),
      ...(claimDocumentUrls || {})
    };

    // Write back to Firestore
    await updateDoc(doc(db, 'rentals', rentalId), {
      documents: docsMap,
      updatedAt: new Date()
    });
    console.log("Rental document URLs updated in Firestore");

    return {
      agreementUrl,
      invoiceUrl,
      ...(permitUrl && { permitUrl }),
      ...(claimDocumentUrls && { claimDocumentUrls })
    };
  } catch (error) {
    console.error('Error uploading rental documents:', error);
    throw new Error('Failed to upload rental documents');
  }
};
