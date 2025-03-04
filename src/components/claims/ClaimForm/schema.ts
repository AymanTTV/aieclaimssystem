import { z } from 'zod';

const PROGRESS_OPTIONS = [
  'Your Claim Has Started',
  'Reported to Legal Team', 
  'Engineer Report Pending',
  'Awaiting TPI',
  'Claim in Progress',
  'Claim Complete'
] as const;

const isValidDateString = (value: string) => {
  const date = new Date(value);
  return !isNaN(date.getTime());
};

// Vehicle schema for hire details
const hireVehicleSchema = z.object({
  make: z.string(),
  model: z.string(),
  registration: z.string(),
  claimRate: z.number()
}).optional();

const recoverySchema = z.object({
  enabled: z.boolean().default(false),
  date: z.string().optional(),
  locationPickup: z.string().optional(),
  locationDropoff: z.string().optional(),
  cost: z.number().min(0).optional()
}).optional();

// Hire Details Schema
const hireDetailsSchema = z.object({
  enabled: z.boolean().default(false),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  daysOfHire: z.number().min(0).default(0),
  claimRate: z.number().min(0).default(340),
  deliveryCharge: z.number().min(0).default(0),
  collectionCharge: z.number().min(0).default(0),
  insurancePerDay: z.number().min(0).default(0),
  totalCost: z.number().min(0).optional(),
  personalInjuryId: z.string().optional(),
  personalInjuryRef: z.string().optional(),
  vehicle: hireVehicleSchema
}).optional();

// Storage Schema
const storageSchema = z.object({
  enabled: z.boolean().default(false),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  costPerDay: z.number().min(0).optional(),
  totalCost: z.number().min(0).optional()
}).optional();

// GP Information Schema - Updated to make fields optional
const gpInformationSchema = z.object({
  visited: z.boolean(),
  gpName: z.string().optional(),
  gpAddress: z.string().optional(),
  gpDoctorName: z.string().optional(),
  gpDate: z.string().optional(),
  gpContactNumber: z.string().optional(),
  gpNotes: z.string().optional()
});

// Main Claim Form Schema
export const claimFormSchema = z.object({
  submitterType: z.enum(['company', 'client']),
  clientRef: z.string().optional(),
  clientInfo: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email address'),
    dateOfBirth: z.string().refine(isValidDateString, {
      message: 'Invalid date format'
    }),
    nationalInsuranceNumber: z.string().min(1, 'NI number is required'),
    address: z.string().min(1, 'Address is required'),
    signature: z.string().optional()
  }),
  clientVehicle: z.object({
    registration: z.string().min(1, 'Registration number is required'),
    documents: z.record(z.union([z.string(), z.instanceof(File)]).optional()),
    motExpiry: z.string().min(1, 'MOT expiry date is required'),
    roadTaxExpiry: z.string().min(1, 'Road tax expiry date is required')
  }),
  incidentDetails: z.object({
    date: z.string().refine(isValidDateString, {
      message: 'Please enter a valid date'
    }),
    time: z.string().min(1, 'Time is required'),
    location: z.string().min(1, 'Location is required'),
    description: z.string().min(1, 'Description is required'),
    damageDetails: z.string().min(1, 'Damage details are required')
  }),
  thirdParty: z.object({
    name: z.string().min(1, 'Third party name is required'),
    phone: z.string().min(1, 'Third party phone is required'),
    address: z.string().min(1, 'Third party address is required'),
    email: z.string().email('Invalid email address').optional(),
    registration: z.string().min(1, 'Third party registration is required')
  }),
  passengers: z.array(z.object({
    name: z.string(),
    address: z.string(),
    postCode: z.string(),
    dob: z.string(),
    contactNumber: z.string()
  })).optional().default([]),
  witnesses: z.array(z.object({
    name: z.string(),
    address: z.string(),
    postCode: z.string(),
    dob: z.string(),
    contactNumber: z.string()
  })).optional().default([]),
  evidence: z.object({
    images: z.array(z.union([z.string(), z.instanceof(File)])),
    videos: z.array(z.union([z.string(), z.instanceof(File)])),
    clientVehiclePhotos: z.array(z.union([z.string(), z.instanceof(File)])),
    engineerReport: z.array(z.union([z.string(), z.instanceof(File)])),
    bankStatement: z.array(z.union([z.string(), z.instanceof(File)])),
    adminDocuments: z.array(z.union([z.string(), z.instanceof(File)]))
  }),
  hireDetails: hireDetailsSchema,
  storage: storageSchema,
  gpInformation: gpInformationSchema,
  fileHandlers: z.object({
    aieHandler: z.string().min(1, 'AIE handler is required'),
    legalHandler: z.string().min(1, 'Legal handler is required')
  }),
  policeOfficerName: z.string().optional().nullable(),
  policeBadgeNumber: z.string().optional().nullable(),
  policeStation: z.string().optional().nullable(),
  policeIncidentNumber: z.string().optional().nullable(),
  policeContactInfo: z.string().optional().nullable(),

  paramedicNames: z.string().optional().nullable(),
  ambulanceReference: z.string().optional().nullable(),
  ambulanceService: z.string().optional().nullable(),

  recovery: recoverySchema,
  
  claimType: z.enum(['Domestic', 'Taxi', 'PI', 'PCO']).default('Domestic'),
  personalInjuryId: z.string().optional(),
  personalInjuryRef: z.string().optional(),
  claimReason: z.array(z.enum(['VD', 'H', 'S', 'PI'])).min(1, 'At least one claim reason must be selected'),
  caseProgress: z.enum(['Win', 'Lost', 'Awaiting', '50/50']).default('Awaiting'),
  progress: z.enum(PROGRESS_OPTIONS),
  statusDescription: z.string().optional(),
  progressHistory: z.array(z.object({
    id: z.string(),
    date: z.date(),
    status: z.string(),
    note: z.string(),
    author: z.string()
  })).optional().default([])
}).superRefine((data, ctx) => {
  // Only validate hire details if H is selected
  if (data.claimReason.includes('H')) {
    if (!data.hireDetails?.enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Hire details are required when H is selected",
        path: ["hireDetails"]
      });
    }
  }

  // Only validate storage details if S is selected
  if (data.claimReason.includes('S')) {
    if (!data.storage?.enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Storage details are required when S is selected",
        path: ["storage"]
      });
    }
  }

  // Only validate GP information if PI is selected
  if (data.claimReason.includes('PI')) {
    if (!data.gpInformation.visited) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please indicate if GP was visited",
        path: ["gpInformation", "visited"]
      });
    }
  }
});

export type ClaimFormData = z.infer<typeof claimFormSchema>;