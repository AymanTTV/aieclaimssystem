import { z } from 'zod';

export const claimFormSchema = z.object({
  // Driver Details
  driverName: z.string().min(1, 'Name is required'),
  driverAddress: z.string().min(1, 'Address is required'),
  driverPostCode: z.string().min(1, 'Post code is required'),
  driverDOB: z.string().min(1, 'Date of birth is required'),
  driverPhone: z.string().min(1, 'Telephone number is required'),
  driverMobile: z.string().min(1, 'Mobile number is required'),
  driverNIN: z.string().min(1, 'National Insurance Number is required'),

  // Vehicle Details
  registeredKeeperName: z.string().min(1, 'Registered keeper name is required'),
  registeredKeeperAddress: z.string().optional(),
  vehicleMake: z.string().min(1, 'Vehicle make is required'),
  vehicleModel: z.string().min(1, 'Vehicle model is required'),
  vehicleVRN: z.string().min(1, 'Vehicle VRN is required'),
  insuranceCompany: z.string().min(1, 'Insurance company is required'),
  policyNumber: z.string().min(1, 'Policy number is required'),
  policyExcess: z.number().min(0, 'Policy excess must be 0 or greater').optional(),

  // Fault Party Details
  faultPartyName: z.string().min(1, 'Fault party name is required'),
  faultPartyAddress: z.string().optional(),
  faultPartyPostCode: z.string().optional(),
  faultPartyPhone: z.string().optional(),
  faultPartyVehicle: z.string().optional(),
  faultPartyVRN: z.string().min(1, 'Fault party VRN is required'),
  faultPartyInsurance: z.string().optional(),

  // Accident Details
  accidentDate: z.string().min(1, 'Accident date is required'),
  accidentTime: z.string().min(1, 'Accident time is required'),
  accidentLocation: z.string().min(1, 'Accident location is required'),
  description: z.string().min(1, 'Description is required'),
  damageDetails: z.string().min(1, 'Damage details are required'),

  // Passengers
  passengers: z.array(z.object({
    name: z.string(),
    address: z.string(),
    postCode: z.string(),
    dob: z.string(),
    contactNumber: z.string()
  })).optional(),

  // Witness Details
  witnessName: z.string().optional(),
  witnessAddress: z.string().optional(),
  witnessPostCode: z.string().optional(),
  witnessDOB: z.string().optional(),
  witnessContact: z.string().optional(),

  // Police Details
  policeOfficerName: z.string().optional(),
  policeBadgeNumber: z.string().optional(),
  policeStation: z.string().optional(),
  policeIncidentNumber: z.string().optional(),
  policeContactInfo: z.string().optional(),

  // Paramedic Details
  paramedicNames: z.string().optional(),
  ambulanceReference: z.string().optional(),
  ambulanceService: z.string().optional()
});

export type ClaimFormData = z.infer<typeof claimFormSchema>;