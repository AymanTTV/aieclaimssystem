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

  // System Fields
  status: 'reported' | 'investigating' | 'processing' | 'resolved';
  type?: 'fault' | 'non-fault' | 'pending';
  amount: number;
  images?: string[];
  submittedBy: string;
  submittedAt: Date;
  updatedAt: Date;
  updatedBy?: string;
  notes?: string;
}