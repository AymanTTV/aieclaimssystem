import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { getCompanyDetails } from './companyDetails';
import toast from 'react-hot-toast';
import { VehicleDocument, MaintenanceDocument, RentalDocument, AccidentDocument } from '../components/pdf/documents';

// Generic document generation function
export const generateAndUploadDocument = async (
  Component: React.ComponentType<any>,
  data: any,
  path: string,
  recordId: string,
  collectionName: string
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
    const storageRef = ref(storage, `${path}/${recordId}/document.pdf`);
    const snapshot = await uploadBytes(storageRef, pdfBlob, {
      contentType: 'application/pdf',
      customMetadata: {
        'Cache-Control': 'public,max-age=7200'
      }
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update record with document URL
    await updateDoc(doc(db, collectionName, recordId), {
      documentUrl: downloadURL,
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


// Helper function to get company details
export const getCompanyDetails = async () => {
  const docRef = doc(db, 'companySettings', 'details');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    throw new Error('Company details not found');
  }
  
  return docSnap.data();
};

// Export specific document generators
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