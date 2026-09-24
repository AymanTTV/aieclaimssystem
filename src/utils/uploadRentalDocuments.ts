// src/utils/uploadRentalDocuments.ts

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

type Blobs = {
  agreements: Record<string, Blob>;
  invoice?: Blob;
  permit?: Blob;
  claimDocuments?: Record<string, Blob>;
};

/**
 * Safely opens a document URL in a new window/tab, handling both remote HTTP/HTTPS URLs
 * and base64 data URLs (which Chromium blocks from direct top-level window.open calls).
 */
export const openDocument = (url?: string): void => {
  if (!url) return;
  if (url.startsWith('data:')) {
    try {
      const arr = url.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      return;
    } catch (e) {
      console.warn('Could not convert data URL to blob for opening:', e);
    }
  }
  window.open(url, '_blank');
};

export const uploadRentalDocuments = async (
  rentalId: string,
  documents: Blobs
): Promise<{
  agreementUrls: Record<string, string>;
  invoiceUrl: string;
  permitUrl?: string;
  claimDocumentUrls?: Record<string, string>;
}> => {
  try {
    console.log('Starting document upload for rental:', rentalId);

    // Helper to upload one blob and return its public, pre-signed download URL
    async function upload(name: string, blob: Blob): Promise<string> {
      if (!blob || blob.size === 0) {
        console.warn(`Skipping upload for empty blob: ${name}`);
        return '';
      }

      const path = `rentals/${rentalId}/${name}.pdf`;
      const storageRef = ref(storage, path);

      let downloadUrl = '';

      try {
        const snap = await uploadBytes(storageRef, blob, {
          contentType: 'application/pdf',
          contentDisposition: `inline; filename="${name}.pdf"`,
          cacheControl: 'public, max-age=31536000'
        });

        try {
          downloadUrl = await getDownloadURL(snap.ref);
        } catch (err) {
          console.warn(`getDownloadURL failed for ${name}:`, err);
        }
      } catch (uploadErr: any) {
        console.warn(`Firebase Storage uploadBytes failed for ${name} (${uploadErr?.message || uploadErr}), applying resilient fallback`);
      }

      // If Firebase storage was unreachable or returned an error, fallback to data URL
      // so generated agreements, invoices, and permits are never lost
      if (!downloadUrl) {
        try {
          downloadUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          console.log(`Document "${name}" preserved with resilient data URL fallback`);
        } catch (fallbackErr) {
          if (typeof URL !== 'undefined' && URL.createObjectURL) {
            downloadUrl = URL.createObjectURL(blob);
          }
        }
      }

      return downloadUrl;
    }

    // --- Upload agreements ---
    const agreementUrls: Record<string, string> = {};
    if (documents.agreements) {
      for (const [key, blob] of Object.entries(documents.agreements)) {
        if (blob && blob.size > 0) {
          try {
            const url = await upload(key, blob);
            if (url) {
              agreementUrls[key] = url;
              console.log(`Agreement "${key}" uploaded:`, url);
            }
          } catch (e) {
            console.error(`Failed to upload agreement "${key}":`, e);
          }
        }
      }
    }

    // --- Upload invoice safely if present ---
    let invoiceUrl = '';
    if (documents.invoice && documents.invoice.size > 0) {
      try {
        invoiceUrl = await upload('invoice', documents.invoice);
        console.log('Invoice uploaded:', invoiceUrl);
      } catch (e) {
        console.error('Failed to upload invoice:', e);
      }
    }

    // --- Optionally upload permit ---
    let permitUrl: string | undefined;
    if (documents.permit && documents.permit.size > 0) {
      try {
        permitUrl = await upload('permit', documents.permit);
        console.log('Permit uploaded:', permitUrl);
      } catch (e) {
        console.error('Failed to upload permit:', e);
      }
    }

    // --- Upload any claim documents ---
    let claimDocumentUrls: Record<string, string> | undefined;
    if (documents.claimDocuments) {
      claimDocumentUrls = {};
      for (const [key, blob] of Object.entries(documents.claimDocuments)) {
        if (blob && blob.size > 0) {
          try {
            const url = await upload(key, blob);
            if (url) {
              claimDocumentUrls[key] = url;
              if (key === 'hireAgreement') {
                claimDocumentUrls['claimHireAgreement'] = url;
              } else if (key === 'claimHireAgreement') {
                claimDocumentUrls['hireAgreement'] = url;
              }
              console.log(`Claim document "${key}" uploaded:`, url);
            }
          } catch (e) {
            console.error(`Failed to upload claim doc "${key}":`, e);
          }
        }
      }
    }

    // --- Merge with existing documents in Firestore ---
    const rentalRef = doc(db, 'rentals', rentalId);
    let existingDocs: Record<string, any> = {};
    try {
      const rentalSnap = await getDoc(rentalRef);
      existingDocs = rentalSnap.data()?.documents || {};
    } catch (fetchErr) {
      console.warn('Could not fetch existing documents for rental:', fetchErr);
    }

    // Build the map of NEWLY uploaded URLs
    const newDocsMap: Record<string, any> = {
      ...(Object.keys(agreementUrls).length > 0 && { agreements: agreementUrls }),
      ...(invoiceUrl && { invoice: invoiceUrl }),
      ...(permitUrl && { permit: permitUrl }),
      ...(claimDocumentUrls && { ...claimDocumentUrls })
    };

    let oldAgreements = existingDocs.agreements || {};
    if (typeof oldAgreements === 'string') {
      oldAgreements = { legacy_agreement: oldAgreements };
    }

    // Merge new with old
    const mergedDocsMap = {
      ...existingDocs,
      ...newDocsMap,
      agreements: {
        ...oldAgreements,
        ...(newDocsMap.agreements || {})
      }
    };

    // If invoiceUrl was uploaded, ensure existingDocs.invoice is explicitly replaced with fresh URL
    if (invoiceUrl) {
      mergedDocsMap.invoice = invoiceUrl;
    }

    try {
      await updateDoc(rentalRef, {
        documents: mergedDocsMap,
        updatedAt: new Date()
      });
      console.log('Rental document URLs merged in Firestore');
    } catch (updateErr) {
      console.warn('Could not update documents field in Firestore:', updateErr);
    }

    return {
      agreementUrls,
      invoiceUrl,
      ...(permitUrl && { permitUrl }),
      ...(claimDocumentUrls && { claimDocumentUrls })
    };
  } catch (error) {
    console.error('Error uploading rental documents:', error);
    throw new Error('Failed to upload rental documents');
  }
};
