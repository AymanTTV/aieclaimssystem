// src/types/claim.ts

import { LegalHandler } from './legalHandler'; // Import the new LegalHandler type

export type SubmitterType = 'company' | 'client';

export type ClaimProgress =
  | 'Your Claim Has Started'
  | 'Report to Legal Team - Pending'
  | 'TPI (Third Party Insurer) - Notified and Awaiting Response'
  | 'Engineer Report - Pending Completion'
  | 'Vehicle Damage Assessment - Scheduled'
  | 'Liability Accepted'
  | 'Liability Disputed'
  | 'TPI Refuses to Deal with Claim'
  | 'VD Completed Hire Pack - Awaiting Review'
  | 'Claim - Referred to MIB (Motor Insurers\' Bureau)'
  | 'MIB Claim - Under Review/In Progress'
  | 'Awaiting MIB Response/Decision'
  | 'MIB - Completed (Outcome Received)'
  | 'Client Documentation - Pending Submission'
  | 'Hire Pack - Successfully Submitted'
  | 'Accident Circumstances - Under Investigation'
  | 'MIB Claim - Initial Review in Progress'
  | 'Additional Information - Requested from Client'
  | 'Legal Notice - Issued to Third Party'
  | 'Court Proceedings - Initiated'
  | 'Settlement Offer - Under Review'
  | 'Client Approval - Pending for Settlement'
  | 'Negotiation with TPI - Ongoing'
  | 'Settlement Agreement - Finalized'
  | 'Payment Processing - Initiated'
  | 'Final Payment - Received and Confirmed'
  | 'Client Payment Disbursed'
  | 'Claim Completed - Record Archived';

export interface GPInformation {
  visited: boolean;
  gpName?: string;
  gpAddress?: string;
  gpDoctorName?: string;
  gpContactNumber?: string;
  gpDate?: Date | null;
}

export interface HospitalInformation {
  visited: boolean;
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalDoctorName?: string;
  hospitalContactNumber?: string;
  hospitalDate?: Date | null;
}

export interface Claim {
  // Basic Claim Information
  id: string;
  claimId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  dateOfEvent: Date;
  incidentTime: string;
  locationOfEvent: string;
  referralType: 'Web' | 'Phone Call' | 'Existing Client' | 'Other';
  notes?: string;

  // Submitter Details
  submitter: {
    type: SubmitterType;
    companyName?: string;
    companyRegistration?: string;
    companyAddress?: string;
    companyContactNumber?: string;
    companyEmail?: string;
    fullName: string;
    address: string;
    email: string;
    contactNumber: string;
    dob?: Date | null;
    licenseType?: string;
    occupation?: string;
  };

  // Driver Details
  driver: {
    isClaimant: boolean;
    fullName?: string;
    address?: string;
    email?: string;
    contactNumber?: string;
    dob?: Date | null;
    licenseType?: string;
    occupation?: string;
  };

  // Vehicle Details
  vehicle: {
    isClaimantVehicle: boolean;
    registration: string;
    make: string;
    model: string;
    year: number;
    color: string;
    motExpiry: Date | null;
    insurancePolicyNumber: string;
    insuranceCompany: string;
    agreedValue: number;
    vehicleType: string;
    damageDetails: string;
  };

  // Fault Party Details
  faultParty: {
    fullName: string;
    address: string;
    contactNumber: string;
    email: string;
    vehicleRegistration: string;
    vehicleMake: string;
    vehicleModel: string;
    insuranceCompany: string;
    policyNumber: string;
    isInsured: boolean;
  };

  // Accident Details
  accidentDetails: {
    cause: string;
    atFault: 'Claimant' | 'Third Party' | 'Unknown';
    weatherConditions: string;
    roadConditions: string;
    speed?: number;
    policeAttended: boolean;
    policeReportNumber?: string;
  };

  // Passenger Details
  passengers: Array<{
    id: string;
    fullName: string;
    contactNumber: string;
    injuries: string;
  }>;

  // Witness Information
  witnesses: Array<{
    id: string;
    fullName: string;
    contactNumber: string;
    statement: string;
  }>;

  // Police Details
  policeInvolvement: {
    attended: boolean;
    officerName?: string;
    station?: string;
    reportNumber?: string;
    contactNumber?: string;
  };

  // Paramedic Details
  paramedicInvolvement: {
    attended: boolean;
    serviceName?: string;
    paramedicName?: string;
    contactNumber?: string;
    reportNumber?: string;
  };

  // Medical Information
  gpInformation: GPInformation;
  hospitalInformation: HospitalInformation;

  // Hire Details
  hireDetails?: {
    enabled: boolean;
    startDate: Date | null;
    endDate: Date | null;
    dailyHireRate: number;
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
    legalHandler: LegalHandler | null; // Changed to LegalHandler | null
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
    creditHireAgreement?: string;
    uld?: string;
    medicalReport?: string;
    medicalReport2?: string;
    scheduleOfLoss?: string;
    courtBundle?: string;
    interimBilling?: string;
    finalBilling?: string;
    invoice?: string;
    chaseLetter1?: string;
    chaseLetter2?: string;
    chaseLetter3?: string;
    chaseLetter4?: string;
    chaseLetter5?: string;
  };
}