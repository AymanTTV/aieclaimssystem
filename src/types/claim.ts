export interface Claim {
  id: string;
  accidentId: string;
  claimDetails: ClaimDetails;
  status: 'submitted' | 'in-progress' | 'won' | 'lost' | 'settled';
  type: 'fault' | 'non-fault' | 'pending';
  assignedTo: string;
  createdAt: Date;
  updatedAt: Date;
  documents: {
    invoices: ClaimInvoice[];
    incidentReport?: string;
  };
  progressNotes: ProgressNote[];
}

export interface ClaimDetails {
  driverName: string;
  driverAddress: string;
  driverPostCode: string;
  driverDOB: Date;
  driverPhone: string;
  driverMobile: string;
  driverNIN: string;
  registeredKeeperName: string;
  registeredKeeperAddress?: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleVRN: string;
  insuranceCompany: string;
  policyNumber: string;
  policyExcess?: number;
  faultPartyName: string;
  faultPartyAddress?: string;
  faultPartyPostCode?: string;
  faultPartyPhone?: string;
  faultPartyVehicle?: string;
  faultPartyVRN: string;
  faultPartyInsurance?: string;
  accidentDate: Date;
  accidentTime: string;
  accidentLocation: string;
  description: string;
  damageDetails: string;
  passengers?: Passenger[];
  witnessDetails?: Witness;
  policeDetails?: PoliceDetails;
  paramedicDetails?: ParamedicDetails;
}

export interface Passenger {
  name: string;
  address: string;
  postCode: string;
  dob: Date;
  contactNumber: string;
}

export interface Witness {
  name: string;
  address: string;
  postCode: string;
  dob: Date;
  contactNumber: string;
}

export interface PoliceDetails {
  officerName: string;
  badgeNumber: string;
  station: string;
  incidentNumber: string;
  contactInfo: string;
}

export interface ParamedicDetails {
  names: string;
  reference: string;
  service: string;
}

export interface ClaimInvoice {
  id: string;
  type: string;
  amount: number;
  date: Date;
  paid: boolean;
  document: string;
}

export interface ProgressNote {
  id: string;
  date: Date;
  note: string;
  author: string;
}