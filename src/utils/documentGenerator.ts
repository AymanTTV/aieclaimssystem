// src/utils/documentGenerator.ts
import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import toast from 'react-hot-toast';

// Import all Document Components
import { 
  VehicleDocument, 
  MaintenanceDocument, 
  RentalDocument, 
  AccidentDocument,
  ClaimDocument,       
  ClaimBulkDocument,   
  ClaimProgressDocument 
} from '../components/pdf/documents';
import MaintenanceInvoice from '../components/pdf/MaintenanceInvoice'; 
import { InvoiceDocument } from '../components/pdf/documents'; // Ensure InvoiceDocument is imported

// Helper function to get company details
export const getCompanyDetails = async () => {
  const docRef = doc(db, 'companySettings', 'details');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Company details not found');
  }
  
  return docSnap.data();
};

/**
 * Generic document generation function.
 * * ✅ FIX APPLIED: This function now handles flexible arguments.
 * It detects if the 6th argument is 'companyDetails' (object) or 'urlFieldName' (string).
 */
export const generateAndUploadDocument = async (
  Component: React.ComponentType<any>,
  data: any,
  path: string,
  recordId: string,
  collectionName: string,
  arg6?: any, // Can be companyDetails (object) OR urlFieldName (string)
  arg7?: string // If arg6 is companyDetails, this is urlFieldName
) => {
  try {
    let companyDetails;
    let urlFieldName = 'documentUrl'; // Default field name

    // --- ARGUMENT DETECTION LOGIC ---
    // If arg6 is a string, it's the urlFieldName (Legacy/Internal calls)
    if (typeof arg6 === 'string') {
      urlFieldName = arg6;
      companyDetails = await getCompanyDetails(); // Fetch manually
    } 
    // If arg6 is an object, it's companyDetails (Call from Invoices.tsx)
    else if (typeof arg6 === 'object' && arg6 !== null) {
      companyDetails = arg6;
      if (arg7 && typeof arg7 === 'string') {
        urlFieldName = arg7;
      }
    } 
    // If arg6 is undefined, fetch details and use default URL field
    else {
      companyDetails = await getCompanyDetails();
    }
    // --------------------------------

    // Generate PDF
    const pdfBlob = await pdf(
      createElement(Component, {
        data,
        companyDetails
      })
    ).toBlob();

    // Upload to storage
    const storageRef = ref(storage, `${path}/${recordId}/${urlFieldName}.pdf`);
    
    const snapshot = await uploadBytes(storageRef, pdfBlob, {
      contentType: 'application/pdf',
      customMetadata: {
        'Cache-Control': 'public,max-age=7200'
      }
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update record with document URL in the specific field
    await updateDoc(doc(db, collectionName, recordId), {
      [urlFieldName]: downloadURL,
      updatedAt: new Date()
    });

    return downloadURL;
  } catch (error) {
    console.error('Error generating document:', error);
    toast.error('Failed to generate document');
    throw error;
  }
};

// Generate bulk documents for a collection
export const generateBulkDocuments = async (
  Component: React.ComponentType<any>,
  records: any[],
  companyDetails: any,
  extraProps: Record<string, any> = {}
): Promise<Blob> => {
  try {
    const pdfBlob = await pdf(
      createElement(Component, {
        records,
        companyDetails,
        title: 'Records Summary',
        ...extraProps,
      })
    ).toBlob();
    return pdfBlob;
  } catch (error) {
    console.error('Error generating bulk documents:', error);
    toast.error('Failed to generate documents');
    throw error;
  }
};

// --- Specific Document Generators ---

export const generateVehicleDocument = async (record: any) => {
  return generateAndUploadDocument(
    VehicleDocument,
    record,
    'vehicles',
    record.id,
    'vehicles'
  );
};

export const generateMaintenanceDocument = async (record: any) => {
  return generateAndUploadDocument(
    MaintenanceDocument,
    record,
    'maintenance',
    record.id,
    'maintenanceLogs'
  );
};

export const generateRentalDocument = async (record: any) => {
  return generateAndUploadDocument(
    RentalDocument,
    record,
    'rentals',
    record.id,
    'rentals'
  );
};

export const generateAccidentDocument = async (record: any) => {
  return generateAndUploadDocument(
    AccidentDocument,
    record,
    'accidents',
    record.id,
    'accidents'
  );
};

export const generateClaimProgressDocument = async (claim: any) => {
  return generateAndUploadDocument(
    ClaimProgressDocument,
    claim,
    'claims',
    claim.id,
    'claims',
    'progressDocumentUrl' // This works because it's a string (caught by logic above)
  );
};

export const generateMaintenanceInvoiceDocument = async (record: any) => {
  return generateAndUploadDocument(
    MaintenanceInvoice,
    record,
    'maintenance',
    record.id,
    'maintenanceLogs',
    'invoiceUrl' // This works because it's a string (caught by logic above)
  );
};