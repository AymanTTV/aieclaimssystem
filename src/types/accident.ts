export interface Accident {
  id: string;

  refNo: number; // Reference number
  referenceName: string; // Reference name
  // Driver Details
  driverName: string;
  driverAddress: string;
  driverPostCode: string;
  driverDOB: string;
  driverPhone: string;
  driverMobile: string;
  driverNIN: string;

  // Vehicle Details
  registeredKeeperName: string;
  registeredKeeperAddress?: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleVRN: string;
  insuranceCompany: string;
  policyNumber: string;
  policyExcess?: string;

  // Fault Party Details
  faultPartyName: string;
  faultPartyAddress?: string;
  faultPartyPostCode?: string;
  faultPartyPhone?: string;
  faultPartyVehicle?: string;
  faultPartyVRN: string;
  faultPartyInsurance?: string;

  // Accident Details
  accidentDate: string;
  accidentTime: string;
  accidentLocation: string;
  description: string;
  damageDetails: string;

  // Passenger Details
  passengers?: Array<{
    name: string;
    address: string;
    postCode: string;
    dob: string;
    contactNumber: string;
  }>;

  // Witness Details
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

  // Insurance Response & Spreadsheet Fields
  claimNo?: string | number;
  insuranceRefNo?: string;
  insuranceClaimStatus?: string;
  dateFormReceivedFromInsurance?: string;
  reportedDate?: string;
  reportedTime?: string;
  daysTakenToReport?: number;
  timeToReportHours?: number;
  timeToReportDisplay?: string;
  claimReportedBy?: string;
  regNo?: string;

  // Outside Settlement
  settledOutsideInsurance?: boolean;
  outsideSettlementAmount?: number;
  settlementNotes?: string;

  // Financials & Estimates (Insurer Table Format)
  adPaid?: number;
  tpPaid?: number;
  adEst?: number;
  tpPiEst?: number;
  tpDamageEst?: number;
  tpHireEst?: number;
  totalTpEst?: number;
  actRecovery?: number;
  incurred?: number;

  // Classifications & Excess
  accCd?: string;
  fault?: 'Fault' | 'Non-Fault' | 'Split' | string;
  faultType?: 'Fault' | 'Non-Fault' | 'Split' | string;
  lateReporting?: 'Yes' | 'No' | boolean | string;
  lateReportingPenalty?: number;
  penaltyPayment?: number;
  excessApplies?: boolean;
  excessRecovered?: boolean;
  outstandingRecovery?: number;

  // System Fields
  isReported?: boolean; // <-- NEW
  status: 'pending' | 'reported' | 'investigating' | 'processing' | 'resolved'; // <-- UPDATED
  type?: 'fault' | 'non-fault' | 'pending' | 'other';
  otherTypeDescription?: string;
  amount: number;
  images?: string[];
  submittedBy: string;
  submittedAt: Date;
  updatedAt: Date;
  updatedBy?: string;
  notes?: string;
}