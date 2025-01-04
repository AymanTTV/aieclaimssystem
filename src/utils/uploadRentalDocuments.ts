import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const uploadRentalDocuments = async (
  rentalId: string,
  documents: { agreement: Blob; invoice: Blob }
): Promise<{ agreementUrl: string; invoiceUrl: string }> => {
  try {
    // Upload agreement
    const agreementRef = ref(storage, `rentals/${rentalId}/agreement.pdf`);
    const agreementSnapshot = await uploadBytes(agreementRef, documents.agreement, {
      contentType: 'application/pdf'
    });
    const agreementUrl = await getDownloadURL(agreementSnapshot.ref);

    // Upload invoice
    const invoiceRef = ref(storage, `rentals/${rentalId}/invoice.pdf`);
    const invoiceSnapshot = await uploadBytes(invoiceRef, documents.invoice, {
      contentType: 'application/pdf'
    });
    const invoiceUrl = await getDownloadURL(invoiceSnapshot.ref);

    // Update rental record with document URLs
    await updateDoc(doc(db, 'rentals', rentalId), {
      documents: {
        agreement: agreementUrl,
        invoice: invoiceUrl
      },
      updatedAt: new Date()
    });

    return { agreementUrl, invoiceUrl };
  } catch (error) {
    console.error('Error uploading rental documents:', error);
    throw new Error('Failed to upload rental documents');
  }
};