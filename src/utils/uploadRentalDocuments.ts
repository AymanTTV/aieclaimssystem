import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const uploadRentalDocuments = async (
  rentalId: string, 
  documents: { 
    agreement: Blob; 
    invoice: Blob; 
    claimDocuments?: Record<string, Blob> 
  }
): Promise<{ agreementUrl: string; invoiceUrl: string; claimDocumentUrls?: Record<string, string> }> => {
  try {
    console.log("Starting document upload for rental:", rentalId);
    
    // Upload agreement
    const agreementRef = ref(storage, `rentals/${rentalId}/agreement.pdf`);
    const agreementSnapshot = await uploadBytes(agreementRef, documents.agreement, {
      contentType: 'application/pdf'
    });
    const agreementUrl = await getDownloadURL(agreementSnapshot.ref);
    console.log("Agreement uploaded:", agreementUrl);

    // Upload invoice
    const invoiceRef = ref(storage, `rentals/${rentalId}/invoice.pdf`);
    const invoiceSnapshot = await uploadBytes(invoiceRef, documents.invoice, {
      contentType: 'application/pdf'
    });
    const invoiceUrl = await getDownloadURL(invoiceSnapshot.ref);
    console.log("Invoice uploaded:", invoiceUrl);

    // Prepare document URLs object
    const documentUrls: Record<string, string> = {
      agreement: agreementUrl,
      invoice: invoiceUrl
    };

    // Upload claim documents if they exist
    const claimDocumentUrls: Record<string, string> = {};
    if (documents.claimDocuments) {
      console.log("Uploading claim documents:", Object.keys(documents.claimDocuments));
      
      for (const [docName, docBlob] of Object.entries(documents.claimDocuments)) {
        const docRef = ref(storage, `rentals/${rentalId}/claim_${docName}.pdf`);
        const docSnapshot = await uploadBytes(docRef, docBlob, {
          contentType: 'application/pdf'
        });
        const docUrl = await getDownloadURL(docSnapshot.ref);
        claimDocumentUrls[docName] = docUrl;
        documentUrls[docName] = docUrl;
        console.log(`Claim document ${docName} uploaded:`, docUrl);
      }
    }

    // Update rental record with document URLs
    await updateDoc(doc(db, 'rentals', rentalId), {
      documents: documentUrls,
      updatedAt: new Date()
    });
    console.log("Rental document URLs updated in Firestore");

    return { 
      agreementUrl, 
      invoiceUrl, 
      claimDocumentUrls: Object.keys(claimDocumentUrls).length > 0 ? claimDocumentUrls : undefined 
    };
  } catch (error) {
    console.error('Error uploading rental documents:', error);
    throw new Error('Failed to upload rental documents');
  }
};