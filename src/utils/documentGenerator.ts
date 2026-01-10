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
  ClaimDocument,       // Import standard Claim Document
  ClaimBulkDocument,   // Import Bulk Document
  ClaimProgressDocument // Import the new Progress Document
} from '../components/pdf/documents';

// Helper function to get company details
export const getCompanyDetails = async () => {
  const docRef = doc(db, 'companySettings', 'details');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Company details not found');
  }
  
  return docSnap.data();
};

// Generic document generation function
export const generateAndUploadDocument = async (
  Component: React.ComponentType<any>,
  data: any,
  path: string,
  recordId: string,
  collectionName: string,
  urlFieldName: string = 'documentUrl' // Added optional field name parameter (defaults to documentUrl)
) => {
  try {
    // Get company details including terms and conditions
    const companyDetails = await getCompanyDetails();

    // Generate PDF
    const pdfBlob = await pdf(
      createElement(Component, {
        data,
        companyDetails
      })
    ).toBlob();

    // Upload to storage
    // Use the field name in the filename to avoid overwriting if paths overlap
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
        ...extraProps,       // ← spread in vehicles & customers
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

// New Generator for Claim Progress Document
export const generateClaimProgressDocument = async (claim: any) => {
  return generateAndUploadDocument(
    ClaimProgressDocument,
    claim,
    'claims',                // storage path folder
    claim.id,                // record ID
    'claims',                // collection name
    'progressDocumentUrl'    // NEW: Save URL to this field instead of documentUrl
  );
};