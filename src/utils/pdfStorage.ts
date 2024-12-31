import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';

export const uploadPDF = async (pdfBase64: string, path: string): Promise<string> => {
  try {
    // Convert base64 to blob
    const pdfBlob = await fetch(pdfBase64).then(res => res.blob());
    
    // Create storage reference
    const storageRef = ref(storage, path);
    
    // Upload PDF
    const snapshot = await uploadBytes(storageRef, pdfBlob, {
      contentType: 'application/pdf',
      customMetadata: {
        'Cache-Control': 'public,max-age=7200'
      }
    });
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};