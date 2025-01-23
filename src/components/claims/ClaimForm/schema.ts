// src/components/claims/ClaimForm/schema.ts

import { z } from 'zod';

export const claimFormSchema = z.object({

  submitterType: z.enum(['company', 'client']),
  
  // Client Information
  clientRef: z.string().optional(),
  clientInfo: z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().min(1, 'Phone number is required'),
    gender: z.enum(['male', 'female', 'other']),
    dateOfBirth: z.string().min(1, 'Date of birth is required'),
    nationalInsuranceNumber: z.string().min(1, 'NI number is required'),
    address: z.string().min(1, 'Address is required'),
    email: z.string().email('Invalid email address'),
    signature: z.string().optional()
  }),

  // Vehicle Details
  clientVehicle: z.object({
    registration: z.string().min(1, 'Registration number is required'),
    documents: z.object({
      licenseFront: z.string().optional(),
      licenseBack: z.string().optional(),
      logBook: z.string().optional(),
      nsl: z.string().optional(),
      insuranceCertificate: z.string().optional(),
      tflBill: z.string().optional()
    }),
    motExpiry: z.string().min(1, 'MOT expiry date is required'),
    roadTaxExpiry: z.string().min(1, 'Road tax expiry date is required')
  }),

  // Incident Details
  incidentDetails: z.object({
    date: z.string().min(1, 'Incident date is required'),
    time: z.string().min(1, 'Incident time is required'),
    location: z.string().min(1, 'Location is required'),
    description: z.string().min(1, 'Description is required'),
    damageDetails: z.string().min(1, 'Damage details are required')
  }),

  // Evidence
  // src/components/claims/ClaimForm/schema.ts

evidence: z.object({
  images: z.array(z.instanceof(File)).default([]),
  videos: z.array(z.instanceof(File)).default([]),
  clientVehiclePhotos: z.array(z.instanceof(File)).default([]),
  engineerReport: z.array(z.instanceof(File)).default([]),
  bankStatement: z.array(z.instanceof(File)).default([]),
  adminDocuments: z.array(z.instanceof(File)).default([])
}).default({
  images: [],
  videos: [],
  clientVehiclePhotos: [],
  engineerReport: [],
  bankStatement: [],
  adminDocuments: []
}),


  // Third Party Information
  thirdParty: z.object({
    name: z.string().min(1, 'Third party name is required'),
    phone: z.string().min(1, 'Third party phone is required'),
    address: z.string().min(1, 'Third party address is required'),
    email: z.string().email('Invalid email address').optional(),
    registration: z.string().min(1, 'Third party registration is required')
  }),

  // PI Report (Optional)
  piReport: z.object({
    injuryDescription: z.string(),
    nationalSourceNumber: z.string()
  }).optional(),

 // Make hire details completely optional
  hireDetails: z.object({
    startDate: z.string(),
    startTime: z.string(),
    endDate: z.string(),
    endTime: z.string(),
    vehicle: z.object({
      make: z.string(),
      model: z.string(),
      registration: z.string(),
      claimRate: z.number()
    })
  }).optional(),

  // Recovery Details (Optional)
  recovery: z.object({
    date: z.string(),
    locationPickup: z.string(),
    locationDropoff: z.string(),
    cost: z.number().min(0, 'Cost must be 0 or greater')
  }).optional(),

  // Make storage details completely optional
  storage: z.object({
    startDate: z.string(),
    endDate: z.string(),
    costPerDay: z.number(),
    totalCost: z.number()
  }).optional(),

  // Witness Information (Optional)
  witness: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string(),
    email: z.string().email('Invalid email address').optional()
  }).optional(),

  // File Handlers
  fileHandlers: z.object({
    aieHandler: z.string().min(1, 'AIE handler is required'),
    legalHandler: z.string().min(1, 'Legal handler is required')
  }),

  // Claim Details
  claimType: z.enum(['Domestic', 'Taxi', 'PI', 'PCO']),
  claimReason: z.enum(['VD Only', 'VDHS', 'VDH', 'PI', 'VDHSPI']),
  caseProgress: z.enum(['Win', 'Lost', 'Awaiting', '50/50']),
  progress: z.enum(['in-progress', 'completed'])
}).transform((data) => {
  // Remove empty optional sections
  if (!data.hireDetails?.startDate) {
    delete data.hireDetails;
  }
  if (!data.storage?.startDate) {
    delete data.storage;
  }
  return data;
});

export type ClaimFormData = z.infer<typeof claimFormSchema>;
