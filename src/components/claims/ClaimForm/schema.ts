import { z } from 'zod';

const PROGRESS_OPTIONS = [
  'Your Claim Has Started',
  'Report to Legal Team - Pending',
  'TPI (Third Party Insurer) - Notified and Awaiting Response',
  'Engineer Report - Pending Completion',
  'Vehicle Damage Assessment - Scheduled',
  'Liability Accepted',
  'Liability Disputed',
  'TPI Refuses to Deal with Claim',
  'VD Completed Hire Pack - Awaiting Review',
  'Claim - Referred to MIB (Motor Insurers\' Bureau)',
  'MIB Claim - Under Review/In Progress',
  'Awaiting MIB Response/Decision',
  'MIB - Completed (Outcome Received)',
  'Client Documentation - Pending Submission',
  'Hire Pack - Successfully Submitted',
  'Accident Circumstances - Under Investigation',
  'MIB Claim - Initial Review in Progress',
  'Additional Information - Requested from Client',
  'Legal Notice - Issued to Third Party',
  'Court Proceedings - Initiated',
  'Settlement Offer - Under Review',
  'Client Approval - Pending for Settlement',
  'Negotiation with TPI - Ongoing',
  'Settlement Agreement - Finalized',
  'Payment Processing - Initiated',
  'Final Payment - Received and Confirmed',
  'Client Payment Disbursed',
  'Claim Completed - Record Archived',
] as const;

const isValidDateString = (value: string) => {
  const date = new Date(value);
  return !isNaN(date.getTime());
};

const hireVehicleSchema = z
  .object({
    make:         z.string(),
    model:        z.string(),
    registration: z.string(),
    claimRate:    z.number()
  })
  .optional();

const recoverySchema = z
  .object({
    enabled:        z.boolean().default(false),
    date:           z.string().optional(),
    locationPickup: z.string().optional(),
    locationDropoff:z.string().optional(),
    cost:           z.number().min(0).optional()
  })
  .optional();

const hireDetailsSchema = z
  .object({
    enabled:          z.boolean().default(false),
    startDate:        z.string().optional(),
    startTime:        z.string().optional(),
    endDate:          z.string().optional(),
    endTime:          z.string().optional(),
    daysOfHire:       z.number().min(0).default(0),
    claimRate:        z.number().min(0).default(340),
    deliveryCharge:   z.number().min(0).default(0),
    collectionCharge: z.number().min(0).default(0),
    insurancePerDay:  z.number().min(0).default(0),
    totalCost:        z.number().min(0).optional(),
    personalInjuryId: z.string().optional(),
    personalInjuryRef:z.string().optional(),
    vehicle:          hireVehicleSchema
  })
  .optional();

const storageSchema = z
  .object({
    enabled:     z.boolean().default(false),
    startDate:   z.string().optional(),
    endDate:     z.string().optional(),
    costPerDay:  z.number().min(0).optional(),
    totalCost:   z.number().min(0).optional()
  })
  .optional();

const gpInformationSchema = z.object({
  visited:        z.boolean(),
  gpName:         z.string().optional(),
  gpAddress:      z.string().optional(),
  gpDoctorName:   z.string().optional(),
  gpDate:         z.string().optional(),
  gpContactNumber:z.string().optional(),
  gpNotes:        z.string().optional()
});

const hospitalInformationSchema = z.object({
  visited:              z.boolean(),
  hospitalName:         z.string().optional(),
  hospitalAddress:      z.string().optional(),
  hospitalDoctorName:   z.string().optional(),
  hospitalDate:         z.string().optional(),
  hospitalContactNumber:z.string().optional(),
  hospitalNotes:        z.string().optional()
});

export const claimFormSchema = z
  .object({
    submitterType: z.enum(['company', 'client']),
    clientRef:     z.string().optional(),

    clientInfo: z.object({
      name:   z.string().min(1, 'Name is required'),
      phone:  z.string().min(1, 'Phone number is required'),
      email:  z.string().email('Invalid email address'),
      dateOfBirth: z.string().refine(isValidDateString, {
        message: 'Invalid date format'
      }),
      occupation: z.string().optional(),           // ← NEW
      injuryDetails: z.string().optional(),        // ← NEW
      nationalInsuranceNumber: z.string().min(1, 'NI number is required'),
      address: z.string().min(1, 'Address is required'),
      signature: z.string().optional()
    }),

    // <-- now optional, we only enforce its fields in superRefine
    clientVehicle: z
      .object({
        registration:  z.string().optional(),
        documents:     z.record(z.union([z.string(), z.instanceof(File)])).optional(),
        motExpiry:     z.string().optional(),
        roadTaxExpiry: z.string().optional()
      })
      .optional(),

    // <-- now optional, we only enforce its fields in superRefine
    registerKeeper: z
    .object({
      enabled:     z.boolean().default(false),
      name:        z.string().optional(),
      address:     z.string().optional(),
      phone:       z.string().optional(),
      email: z
      .union([ z.string().email('Invalid email address'), z.literal('') ])
      .optional(),  
      dateOfBirth: z.string().optional(),
      signature:   z.string().optional(),
    })
    .default({ enabled: false }),

    incidentDetails: z.object({
      date:           z.string().refine(isValidDateString, { message: 'Please enter a valid date' }),
      time:           z.string().min(1, 'Time is required'),
      location:       z.string().min(1, 'Location is required'),
      description:    z.string().min(1, 'Description is required'),
      damageDetails:  z.string().min(1, 'Damage details are required')
    }),

    thirdParty: z.object({
      name:         z.string().min(1, 'Third party name is required'),
      phone:        z.string().min(1, 'Third party phone is required'),
      address:      z.string().min(1, 'Third party address is required'),
      email:        z.string().email('Invalid email address').optional(),
      registration: z.string().min(1, 'Third party registration is required')
    }),

    passengers: z
      .array(
        z.object({
          name:          z.string(),
          address:       z.string(),
          postCode:      z.string(),
          dob:           z.string(),
          contactNumber: z.string()
        })
      )
      .optional()
      .default([]),

    witnesses: z
      .array(
        z.object({
          name:          z.string(),
          address:       z.string(),
          postCode:      z.string(),
          dob:           z.string(),
          contactNumber: z.string()
        })
      )
      .optional()
      .default([]),

    evidence: z.object({
      images:               z.array(z.union([z.string(), z.instanceof(File)])),
      videos:               z.array(z.union([z.string(), z.instanceof(File)])),
      clientVehiclePhotos:  z.array(z.union([z.string(), z.instanceof(File)])),
      engineerReport:       z.array(z.union([z.string(), z.instanceof(File)])),
      bankStatement:        z.array(z.union([z.string(), z.instanceof(File)])),
      adminDocuments:       z.array(z.union([z.string(), z.instanceof(File)]))
    }),

    hireDetails: hireDetailsSchema,
    storage:     storageSchema,
    gpInformation:       gpInformationSchema,
    hospitalInformation: hospitalInformationSchema,
    recovery:            recoverySchema,

    fileHandlers: z.object({
  aieHandler: z.string().min(1, 'AIE handler is required'),
  legalHandler: z.object({
    id: z.string().min(1, 'Legal handler ID is required'),
    name: z.string().min(1, 'Legal handler name is required'),
    email: z.string().email('Invalid legal handler email'),
    phone: z.string().min(1, 'Legal handler phone is required'),
    address: z.string().min(1, 'Legal handler address is required')
  })
}),


    policeOfficerName:   z.string().optional().nullable(),
    policeBadgeNumber:   z.string().optional().nullable(),
    policeStation:       z.string().optional().nullable(),
    policeIncidentNumber:z.string().optional().nullable(),
    policeContactInfo:   z.string().optional().nullable(),

    paramedicNames:      z.string().optional().nullable(),
    ambulanceReference:  z.string().optional().nullable(),
    ambulanceService:    z.string().optional().nullable(),

    claimType:    z.enum(['Domestic', 'Taxi', 'PI', 'PCO']).default('Domestic'),
    personalInjuryId: z.string().optional(),
    personalInjuryRef:z.string().optional(),

    claimReason: z
      .array(z.enum(['VD', 'H', 'S', 'PI']))
      .min(1, 'At least one claim reason must be selected'),

    caseProgress: z.enum(['Win', 'Lost', 'Awaiting', '50/50']).default('Awaiting'),
    progress:     z.enum(PROGRESS_OPTIONS),
    statusDescription: z.string().optional(),

    progressHistory: z
      .array(
        z.object({
          id:     z.string(),
          date:   z.date(),
          status: z.string(),
          note:   z.string(),
          author: z.string(),
          amount: z.number().optional()
        })
      )
      .optional()
      .default([])
  })
  .superRefine((data, ctx) => {
    // --- Register Keeper: only validate its fields if enabled === true ---
    if (data.registerKeeper.enabled) {
      if (!data.registerKeeper.name) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Keeper name is required when register keeper is enabled',
          path:    ['registerKeeper', 'name'],
        });
      }
      if (!data.registerKeeper.address) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Keeper address is required when register keeper is enabled',
          path:    ['registerKeeper', 'address'],
        });
      }
      if (!data.registerKeeper.phone) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Keeper phone is required when register keeper is enabled',
          path:    ['registerKeeper', 'phone'],
        });
      }
      if (!data.registerKeeper.email) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Keeper email is required when register keeper is enabled',
          path:    ['registerKeeper', 'email'],
        });
      }
      if (!data.registerKeeper.dateOfBirth) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Keeper date of birth is required when register keeper is enabled',
          path:    ['registerKeeper', 'dateOfBirth'],
        });
      }
      if (!data.registerKeeper.signature) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Keeper signature is required when register keeper is enabled',
          path:    ['registerKeeper', 'signature'],
        });
      }
    }
  
    // --- Hire Details if enabled ---
    if (data.hireDetails?.enabled) {
      if (!data.hireDetails.startDate) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Hire start date is required',
          path:    ['hireDetails', 'startDate'],
        });
      }
      if (!data.hireDetails.endDate) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Hire end date is required',
          path:    ['hireDetails', 'endDate'],
        });
      }
      // …add other hire fields as needed
    }
  
    // --- Storage Details if enabled ---
    if (data.storage?.enabled) {
      if (!data.storage.startDate) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Storage start date is required',
          path:    ['storage', 'startDate'],
        });
      }
      if (!data.storage.endDate) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Storage end date is required',
          path:    ['storage', 'endDate'],
        });
      }
    }
  
    // --- Recovery Details if enabled ---
    if (data.recovery?.enabled) {
      if (!data.recovery.date) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Recovery date is required',
          path:    ['recovery', 'date'],
        });
      }
      if (!data.recovery.locationPickup) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Recovery pickup location is required',
          path:    ['recovery', 'locationPickup'],
        });
      }
      if (!data.recovery.locationDropoff) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Recovery drop-off location is required',
          path:    ['recovery', 'locationDropoff'],
        });
      }
      if (data.recovery.cost == null) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Recovery cost is required',
          path:    ['recovery', 'cost'],
        });
      }
    }
  
    // --- Vehicle Details when VD is selected ---
    if (data.claimReason.includes('VD')) {
      if (!data.clientVehicle.registration) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Vehicle registration is required when VD is selected',
          path:    ['clientVehicle', 'registration'],
        });
      }
      if (!data.clientVehicle.motExpiry) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'MOT expiry is required when VD is selected',
          path:    ['clientVehicle', 'motExpiry'],
        });
      }
      if (!data.clientVehicle.roadTaxExpiry) {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Road tax expiry is required when VD is selected',
          path:    ['clientVehicle', 'roadTaxExpiry'],
        });
      }
    }

    if (data.claimReason.includes('PI')) {
      if (!data.clientInfo.occupation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Occupation is required when PI is selected',
          path: ['clientInfo', 'occupation']
        });
      }
      if (!data.clientInfo.injuryDetails) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Injury details are required when PI is selected',
          path: ['clientInfo', 'injuryDetails']
        });
      }
    }
  
    // --- GP & Hospital when PI is selected ---
    if (data.claimReason.includes('PI')) {
      // GP
      if (data.gpInformation.visited) {
        if (!data.gpInformation.gpName) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'GP name is required when GP visit is indicated',
            path:    ['gpInformation', 'gpName'],
          });
        }
        if (!data.gpInformation.gpAddress) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'GP address is required when GP visit is indicated',
            path:    ['gpInformation', 'gpAddress'],
          });
        }
        if (!data.gpInformation.gpDoctorName) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'GP doctor name is required when GP visit is indicated',
            path:    ['gpInformation', 'gpDoctorName'],
          });
        }
        if (!data.gpInformation.gpDate) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'GP visit date is required',
            path:    ['gpInformation', 'gpDate'],
          });
        }
        if (!data.gpInformation.gpContactNumber) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'GP contact number is required',
            path:    ['gpInformation', 'gpContactNumber'],
          });
        }
      } else if (typeof data.gpInformation.visited !== 'boolean') {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Please indicate if GP was visited',
          path:    ['gpInformation', 'visited'],
        });
      }
  
      // Hospital
      if (data.hospitalInformation.visited) {
        if (!data.hospitalInformation.hospitalName) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'Hospital name is required when hospital visit is indicated',
            path:    ['hospitalInformation', 'hospitalName'],
          });
        }
        if (!data.hospitalInformation.hospitalAddress) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'Hospital address is required when hospital visit is indicated',
            path:    ['hospitalInformation', 'hospitalAddress'],
          });
        }
        if (!data.hospitalInformation.hospitalDoctorName) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'Hospital doctor name is required when hospital visit is indicated',
            path:    ['hospitalInformation', 'hospitalDoctorName'],
          });
        }
        if (!data.hospitalInformation.hospitalDate) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'Hospital visit date is required',
            path:    ['hospitalInformation', 'hospitalDate'],
          });
        }
        if (!data.hospitalInformation.hospitalContactNumber) {
          ctx.addIssue({
            code:    z.ZodIssueCode.custom,
            message: 'Hospital contact number is required',
            path:    ['hospitalInformation', 'hospitalContactNumber'],
          });
        }
      } else if (typeof data.hospitalInformation.visited !== 'boolean') {
        ctx.addIssue({
          code:    z.ZodIssueCode.custom,
          message: 'Please indicate if hospital was visited',
          path:    ['hospitalInformation', 'visited'],
        });
      }
    }
  });
  

export type ClaimFormData = z.infer<typeof claimFormSchema>;