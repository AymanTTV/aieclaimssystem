export type SubmitterType = 'company' | 'client';

export interface Claim {
  id: string;
  clientRef?: string;
  submitterType: SubmitterType; // Add this field
  
  // Client Information
  clientInfo: {
    name: string;
    phone: string;
    gender: 'male' | 'female' | 'other';
    dateOfBirth: Date;
    nationalInsuranceNumber: string;
    address: string;
    email: string;
    signature?: string;
  };

  // Driver Details
  driverName: string;
  driverAddress: string;
  driverPostCode: string;
  driverDOB: string;
  driverMobile: string;
  driverEmail: string; // Added email
  driverNIN: string;
  driverSignature: string; // Added signature

  // Vehicle Details
  registeredKeeperName: string;
  registeredKeeperAddress?: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleVRN: string;
  insuranceCompany: string;
  policyNumber: string;
  policyExcess?: string;

  // Third Party Details
  thirdParty: {
    name: string;
    phone: string;
    address: string;
    email: string;
    registration: string;
  };

  // Incident Details
  incidentDetails: {
    date: Date;
    time: string;
    location: string;
    description: string;
    damageDetails: string;
  };

  // Passengers (Optional)
  passengers?: Array<{
    name: string;
    phone: string;
    email: string;
    gender: 'male' | 'female' | 'other';
    address: string;
  }>;

  // Witnesses (Optional)
  witnesses?: Array<{
    name: string;
    phone: string;
    email: string;
    address: string;
  }>;

  // Police Details (Optional)
  policeDetails?: {
    cadNumber?: string;
    policeStation: string;
    contactNumber: string;
    notes?: string;
  };

  // Paramedic Details (Optional)
  paramedicDetails?: {
    ambulanceNumber: string;
    hospital: string;
    date: Date;
    time: string;
    notes?: string;
  };

  // Evidence & Documents
  evidence: {
    images: string[];
    videos: string[];
    clientVehiclePhotos: string[];
    engineerReport: string[];  // Changed to array
    bankStatement: string[];   // Changed to array
    adminDocuments: string[];
  };

  // Hire Details (Optional)
  hireDetails?: {
    startDate: Date;
    startTime: string;
    endDate: Date;
    endTime: string;
    vehicle: {
      make: string;
      model: string;
      registration: string;
      claimRate: number;
    };
  };

  // Recovery Details (Optional)
  recovery?: {
    date: Date;
    locationPickup: string;
    locationDropoff: string;
    cost: number;
  };

  // Storage Details (Optional)
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

  // Status History
  statusHistory: Array<{
    status: string;
    description: string;
    date: Date;
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

  // Claim Details
  claimType: ClaimType;
  claimReason: ClaimReason;
  caseProgress: CaseProgress;
  progress: ClaimProgress;

  // System Fields
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}
