// src/types/claim.ts

import { LegalHandler } from './legalHandler'; // Import the new LegalHandler type

export type SubmitterType = 'company' | 'client';

export type ClaimProgress =
  | 'Your Claim Has Started'
  | 'Client Contacted for Initial Statement'
  | 'Accident Details Verified'
  | 'Report to Legal Team - Pending'
  | 'Legal Team Reviewing Claim'
  | 'Client Documentation - Pending Submission'
  | 'Additional Information - Requested from Client'
  | 'Client Failed to Respond'
  | 'TPI (Third Party Insurer) - Notified and Awaiting Response'
  | 'TPI Acknowledged Notification'
  | 'TPI Refuses to Deal with Claim'
  | 'TPI Accepted Liability'
  | 'TPI Rejected Liability'
  | 'TPI Liability - 50/50 Split Under Review'
  | 'TPI Liability - 50/50 Split Agreed'
  | 'TPI Liability - Partial Split Under Review'
  | 'TPI Liability - Partial Split (Other Ratio Agreed)'
  | 'Liability Disputed - Awaiting Evidence from Client'
  | 'Liability Disputed - TPI Provided Counter Evidence'
  | 'Liability Disputed - Under Legal Review'
  | 'Liability Disputed - Witness Statement Requested'
  | 'Liability Disputed - Expert Report Required'
  | 'Liability Disputed - Negotiation Ongoing'
  | 'Liability Disputed - No Agreement Reached'
  | 'Liability Disputed - Referred to Court'
  | 'Engineer Assigned'
  | 'Engineer Report - Pending Completion'
  | 'Engineer Report - Completed'
  | 'Vehicle Damage Assessment - TPI Scheduled'
  | 'Vehicle Inspection - Completed'
  | 'Repair Authorisation - Awaiting Approval'
  | 'Repair in Progress'
  | 'Vehicle Repair - Completed'
  | 'Total Loss - Awaiting Valuation'
  | 'Total Loss Offer - Made'
  | 'Total Loss Offer - Accepted'
  | 'Total Loss Offer - Disputed'
  | 'Salvage Collected'
  | 'Salvage Payment Received'
  | 'Hire Vehicle - Arranged'
  | 'Hire Period - Ongoing'
  | 'Hire Vehicle - Off-Hired'
  | 'Hire Invoice - Generated'
  | 'Hire Pack - Successfully Submitted'
  | 'VD Completed Hire Pack - Awaiting Review'
  | 'TPI made VD offer - Ongoing'
  | 'VD Negotiation with TPI - Ongoing'
  | 'VD payment Received - Prejudice basis'
  | 'VD payment Received - with VAT'
  | 'VD payment Received - Without VAT'
  | 'PI Medical Report - Requested'
  | 'PI Medical Report - Received'
  | 'PI Negotiation with TPI - Ongoing'
  | 'Settlement Offer - Under Review'
  | 'Client Approval - Pending for Settlement'
  | 'Client Rejected Offer'
  | 'Settlement Agreement - Finalized'
  | 'Legal Notice - Issued to Third Party'
  | 'Court Proceedings - Initiated'
  | 'Court Hearing - Awaiting Date'
  | 'Court Hearing - Completed'
  | 'Judgement in Favour'
  | 'Judgement Against'
  | 'Claim - Referred to MIB (Motor Insurers\' Bureau)'
  | 'MIB Claim - Initial Review in Progress'
  | 'MIB Claim - Under Review/In Progress'
  | 'Awaiting MIB Response/Decision'
  | 'MIB - Completed (Outcome Received)'
  | 'Payment Processing - Initiated'
  | 'Final Payment - Received and Confirmed'
  | 'Client Payment Disbursed'
  | 'Claim Withdrawn by Client'
  | 'Claim Rejected - Insufficient Evidence'
  | 'Claim Suspended - Pending Client Action'
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