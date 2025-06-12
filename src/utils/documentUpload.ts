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
    const path = `rentals/${rentalId}/${name}.pdf`;
    const storageRef = ref(storage, path);
    const snap = await uploadBytes(storageRef, blob, {
      contentType: 'application/pdf'
    });
    const url = await getDownloadURL(snap.ref);
    urls[name] = url;
  }

  // always upload agreement & invoice
  await upload('agreement', documents.agreement);
  await upload('invoice', documents.invoice);

  // optionally upload permit PDF
  if (documents.permit) {
    await upload('permit', documents.permit);
  }

  // if there are claim docs, upload each under its own key
  if (documents.claimDocuments) {
    for (const [key, blob] of Object.entries(documents.claimDocuments)) {
      await upload(key, blob);
    }
  }

  // write the entire map back to Firestore (merges or replaces your `documents` field)
  await updateDoc(doc(db, 'rentals', rentalId), {
    documents: urls,
    updatedAt: new Date()
  });

  return urls;
};
