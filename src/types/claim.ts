// src/types/claim.ts

export type SubmitterType = 'company' | 'client';

export type ClaimProgress = 
  | 'Your Claim Has Started'
  | 'Reported to Legal Team'
  | 'Engineer Report Pending'
  | 'Awaiting TPI'
  | 'Claim in Progress'
  | 'Claim Complete';

export interface GPInformation {
  visited: boolean;
  gpName?: string;
  gpAddress?: string;
  gpDoctorName?: string;
  gpDate?: Date;
  gpContactNumber?: string;
  gpNotes?: string;
}

export interface Claim {
  id: string;
  clientRef?: string;
  submitterType: SubmitterType;
  
  // Client Information
  clientInfo: {
    name: string;
    phone: string;
    email: string;
    dateOfBirth: Date;
    nationalInsuranceNumber: string;
    address: string;
    signature?: string;
  };

  // Vehicle Details
  clientVehicle: {
    registration: string;
    documents: {
      licenseFront?: string;
      licenseBack?: string;
      logBook?: string;
      nsl?: string;
      insuranceCertificate?: string;
      tflBill?: string;
      [key: string]: string | undefined;
    };
    motExpiry: Date;
    roadTaxExpiry: Date;
  };

  // Incident Details
  incidentDetails: {
    date: Date;
    time: string;
    location: string;
    description: string;
    damageDetails: string;
  };

  // Third Party Details
  thirdParty: {
    name: string;
    phone: string;
    address: string;
    email: string;
    registration: string;
  };

  // GP Information
  gpInformation?: GPInformation;

  // Passengers
  passengers?: Array<{
    name: string;
    address: string;
    postCode: string;
    dob: string;
    contactNumber: string;
  }>;

  // Witnesses
  witnesses?: Array<{
    name: string;
    address: string;
    postCode: string;
    dob: string;
    contactNumber: string;
  }>;

  // Police Details
  policeOfficerName: string | null;
  policeBadgeNumber: string | null;
  policeStation: string | null;
  policeIncidentNumber: string | null;
  policeContactInfo: string | null;

  // Paramedic Details
  paramedicNames: string | null;
  ambulanceReference: string | null;
  ambulanceService: string | null;

  // Evidence
  evidence: {
    images: string[];
    videos: string[];
    clientVehiclePhotos: string[];
    engineerReport: string[];
    bankStatement: string[];
    adminDocuments: string[];
  };

  // Hire Details
  hireDetails?: {
    enabled: boolean;
    startDate: Date | null;
    startTime: string;
    endDate: Date | null;
    endTime: string;
    daysOfHire: number;
    claimRate: number;
    deliveryCharge: number;
    collectionCharge: number;
    insurancePerDay: number;
    totalCost: number;
    vehicle?: {
      make: string;
      model: string;
      registration: string;
      claimRate: number;
    } | null;
  };

  // Recovery Details
  recovery?: {
    enabled: boolean;
    date: Date | null;
    locationPickup: string;
    locationDropoff: string;
    cost: number;
  };

  // Storage Details
  storage?: {
    enabled: boolean;
    startDate: Date | null;
    endDate: Date | null;
    costPerDay: number;
    totalCost: number;
  };

  // File Handlers
  fileHandlers: {
    aieHandler: string;
    legalHandler: string;
  };

  // Status and Progress
  claimType: 'Domestic' | 'Taxi' | 'PI' | 'PCO';
  claimReason: Array<'VD' | 'H' | 'S' | 'PI'>;
  caseProgress: 'Win' | 'Lost' | 'Awaiting' | '50/50';
  progress: ClaimProgress;
  statusDescription?: string;

  // Progress History
  progressHistory: Array<{
    id: string;
    date: Date;
    status: string;
    note: string;
    author: string;
    amount?: number;
  }>;

  // Generated Documents
  documents?: {
    conditionOfHire?: string;
    creditHireMitigation?: string;
    noticeOfRightToCancel?: string;
    creditStorageAndRecovery?: string;
    hireAgreement?: string;
    satisfactionNotice?: string;
    [key: string]: string | undefined;
  };

  // System Fields
  createdBy: string;
  submittedAt: Date;
  updatedAt: Date;
  updatedBy?: string;
  documentUrl?: string;
}
