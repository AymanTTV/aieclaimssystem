export type SubmitterType = 'company' | 'client';

export type ClaimProgress = 
  | 'Your Claim Has Started'
  | 'Reported to Legal Team'
  | 'Engineer Report Pending'
  | 'Awaiting TPI'
  | 'Claim in Progress'
  | 'Claim Complete';

export interface Claim {
  id: string;
  clientRef?: string;
  submitterType: 'company' | 'client';
  
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
  policeOfficerName?: string;
  policeBadgeNumber?: string;
  policeStation?: string;
  policeIncidentNumber?: string;
  policeContactInfo?: string;

  // Paramedic Details
  paramedicNames?: string;
  ambulanceReference?: string;
  ambulanceService?: string;

  // Evidence
  evidence: {
    images: string[];
    videos: string[];
    clientVehiclePhotos: string[];
    engineerReport: string[];
    bankStatement: string[];
    adminDocuments: string[];
  };

  // Make hireDetails optional with ?
  hireDetails?: {
    startDate: Date;
    startTime: string;
    endDate: Date;
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
    };
  };

  // Recovery Details
  recovery?: {
    date: Date;
    locationPickup: string;
    locationDropoff: string;
    cost: number;
  };

  // Storage Details
  storage?: {
    startDate: Date;
    endDate: Date;
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
  claimReason: 'VD Only' | 'VDHS' | 'VDH' | 'PI' | 'VDHSPI';
  caseProgress: 'Win' | 'Lost' | 'Awaiting' | '50/50';
  progress: ClaimProgress;
  statusDescription: string;

  // Progress History
  progressHistory: Array<{
    id: string;
    date: Date;
    status: string;
    note: string;
    author: string;
  }>;

  // Generated Documents
  documents?: {
    conditionOfHire?: string;
    creditHireMitigation?: string;
    noticeOfRightToCancel?: string;
    creditStorageAndRecovery?: string;
    hireAgreement?: string;
    satisfactionNotice?: string;
  };

  // System Fields
  submittedBy: string;
  submittedAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}