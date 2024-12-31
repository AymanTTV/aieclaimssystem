import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const uploadRentalDocuments = async (
  rentalId: string, 
  documents: { agreement: Blob; invoice: Blob }
) => {
  try {
    // Upload agreement
    const agreementRef = ref(storage, `rentals/${rentalId}/agreement.pdf`);
    const agreementSnapshot = await uploadBytes(agreementRef, documents.agreement);
    const agreementUrl = await getDownloadURL(agreementSnapshot.ref);

    // Upload invoice
    const invoiceRef = ref(storage, `rentals/${rentalId}/invoice.pdf`);
    const invoiceSnapshot = await uploadBytes(invoiceRef, documents.invoice);
    const invoiceUrl = await getDownloadURL(invoiceSnapshot.ref);

    // Update rental document with URLs
    await updateDoc(doc(db, 'rentals', rentalId), {
      documents: {
        agreement: agreementUrl,
        invoice: invoiceUrl
      }
    });

    return { agreementUrl, invoiceUrl };
  } catch (error) {
    console.error('Error uploading documents:', error);
    throw error;
  }
};