// src/utils/documentUpload.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

type Blobs = {
  agreement: Blob;
  invoice: Blob;
  permit?: Blob;
  claimDocuments?: Record<string, Blob>;
};

export const uploadRentalDocuments = async (
  rentalId: string,
  documents: Blobs
): Promise<Record<string, string>> => {
  // this will collect all the URLs we generate
  const urls: Record<string, string> = {};

  // helper to upload one blob
  async function upload(name: string, blob: Blob) {
    if (!blob || blob.size === 0) return;
    const path = `rentals/${rentalId}/${name}.pdf`;
    const storageRef = ref(storage, path);

    let url = '';

    try {
      const snap = await uploadBytes(storageRef, blob, {
        contentType: 'application/pdf',
        contentDisposition: `inline; filename="${name}.pdf"`,
        cacheControl: 'public, max-age=31536000'
      });

      try {
        url = await getDownloadURL(snap.ref);
      } catch (e) {
        console.warn(`getDownloadURL failed for ${name}:`, e);
      }
    } catch (uploadErr) {
      console.warn(`uploadBytes failed for ${name}:`, uploadErr);
    }

    if (!url) {
      try {
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (fallbackErr) {
        if (typeof URL !== 'undefined' && URL.createObjectURL) {
          url = URL.createObjectURL(blob);
        }
      }
    }

    if (url) {
      urls[name] = url;
    }
  }

  // upload agreement & invoice if valid
  if (documents.agreement && documents.agreement.size > 0) {
    await upload('agreement', documents.agreement);
  }
  if (documents.invoice && documents.invoice.size > 0) {
    await upload('invoice', documents.invoice);
  }

  // optionally upload permit PDF
  if (documents.permit && documents.permit.size > 0) {
    await upload('permit', documents.permit);
  }

  // if there are claim docs, upload each under its own key
  if (documents.claimDocuments) {
    for (const [key, blob] of Object.entries(documents.claimDocuments)) {
      if (blob && blob.size > 0) {
        await upload(key, blob);
      }
    }
  }

  // write the entire map back to Firestore (merges or replaces your `documents` field)
  try {
    await updateDoc(doc(db, 'rentals', rentalId), {
      documents: urls,
      updatedAt: new Date()
    });
  } catch (err) {
    console.warn('Could not update documents in Firestore:', err);
  }

  return urls;
};
