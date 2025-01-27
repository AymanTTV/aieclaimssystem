export interface PersonalInjury {
reference?: string;
  statusHistory?: Array<{
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    notes: string;
    updatedAt: Date;
    updatedBy: string;
  }>;
  id: string;
  // Personal Details
  fullName: string;
  dateOfBirth: Date;
  address: string;
  postcode: string;
  contactNumber: string;
  emailAddress: string;

  // Incident Details
  incidentDate: Date;
  incidentTime: string;
  incidentLocation: string;
  description: string;

  // Injury Details
  injuries: string;
  receivedMedicalTreatment: boolean;
  medicalDetails?: string;

  // Witness Details
  hasWitnesses: boolean;
  witnesses?: Array<{
    name: string;
    contactInfo: string;
  }>;

  // Additional Information
  reportedToAuthorities: boolean;
  policeReferenceNumber?: string;
  hasEvidence: boolean;
  evidenceFiles?: string[];

  // Declaration
  signature: string;
  signatureDate: Date;

  // System Fields
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}
