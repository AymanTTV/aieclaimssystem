// src/utils/entityBranding.ts

import defaultSkylineLogo from '../assets/logo.png';
import defaultClaimsLogo from '../assets/aieclaim.png';
import defaultCompanySignature from '../assets/signiture.png';
import {
  AIE_SKYLINE_LOGO_BASE64,
  AIE_CLAIMS_LOGO_BASE64,
  resolveCompanyLogo,
} from './companyLogoResolver';

export interface CompanyEntity {
  id: string;
  key: string;
  fullName: string;
  tradingName: string;
  registrationNumber: string;
  vatNumber: string;
  officialAddress: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  signatureUrl?: string;
  headerDisclaimer?: string;
  footerDisclaimer?: string;
  isDefault?: boolean;
  assignedModules?: ('rentals' | 'claims' | 'invoices' | 'vehicles')[];
}

export interface DocumentModuleEntityMapping {
  rentalsEntityKey: string;
  claimsEntityKey: string;
  invoicesEntityKey: string;
  vehiclesEntityKey: string;
}

export const DEFAULT_MODULE_ENTITY_MAPPING: DocumentModuleEntityMapping = {
  rentalsEntityKey: 'aie_skyline',
  claimsEntityKey: 'aie_claims',
  invoicesEntityKey: 'aie_skyline',
  vehiclesEntityKey: 'aie_skyline',
};

export interface PageTemplateMappingConfig {
  page1Template: string;
  page2Template: string;
  page3Template: string;
  includePage2: boolean;
  includePage3: boolean;
  page1EntityKey?: string;
  page2EntityKey?: string;
  page3EntityKey?: string;
}

export const PRESET_COMPANY_ENTITIES: CompanyEntity[] = [
  {
    id: 'entity_aie_skyline',
    key: 'aie_skyline',
    fullName: 'AIE Skyline Limited',
    tradingName: 'AIE Skyline',
    registrationNumber: '14592207',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '020 1234 5678',
    email: 'info@aieskyline.co.uk',
    website: 'www.aieskyline.co.uk',
    logoUrl: AIE_SKYLINE_LOGO_BASE64,
    signatureUrl: defaultCompanySignature,
    headerDisclaimer: 'Premier Fleet Solutions & Vehicle Hire Management',
    footerDisclaimer:
      'AIE Skyline Limited, registered in England and Wales (Company No: 14592207)\nRegistered Office: United House, 39-41 North Road, London, N7 9DP. | VAT No: 453448875',
    isDefault: true,
    assignedModules: ['rentals', 'invoices', 'vehicles'],
  },
  {
    id: 'entity_aie_claims',
    key: 'aie_claims',
    fullName: 'AIE Claims LTD',
    tradingName: 'AIE Claims Ltd.',
    registrationNumber: '15616639',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '+442080505337',
    email: 'claims@aieclaims.co.uk',
    website: 'www.aieclaims.co.uk',
    logoUrl: AIE_CLAIMS_LOGO_BASE64,
    signatureUrl: defaultCompanySignature,
    headerDisclaimer: 'Accident Management & Credit Hire Claims Recovery',
    footerDisclaimer:
      'AIE Claims Ltd. Registered in England and Wales with company registration number: 15616639, Registered office address: United House, 39-41 North Road, London, N7 9DP',
    isDefault: false,
    assignedModules: ['claims'],
  },
  {
    id: 'entity_skyline_cabs',
    key: 'skyline_cabs',
    fullName: 'Skyline Cabs & Transportation Ltd',
    tradingName: 'Skyline Cabs',
    registrationNumber: '14882190',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '020 8900 1212',
    email: 'dispatch@skylinecabs.co.uk',
    website: 'www.skylinecabs.co.uk',
    logoUrl: AIE_SKYLINE_LOGO_BASE64,
    signatureUrl: defaultCompanySignature,
    headerDisclaimer: 'Licensed Private Hire & Chauffeur Services',
    footerDisclaimer:
      'Skyline Cabs & Transportation Ltd, registered in England and Wales (Company No: 14882190)\nRegistered Office: United House, 39-41 North Road, London, N7 9DP.',
    isDefault: false,
    assignedModules: ['rentals', 'vehicles'],
  },
  {
    id: 'entity_sayarah_ijaraha',
    key: 'sayarah_ijaraha',
    fullName: 'Sayarah Ijaraha Limited',
    tradingName: 'Sayarah Ijarah',
    registrationNumber: '14992011',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '020 8050 5337',
    email: 'info@sayarahijarah.co.uk',
    website: 'www.sayarahijarah.co.uk',
    logoUrl: AIE_SKYLINE_LOGO_BASE64,
    signatureUrl: defaultCompanySignature,
    headerDisclaimer: 'Islamic Vehicle Lease & Hire Purchase Solutions',
    footerDisclaimer:
      'Sayarah Ijaraha Limited, registered in England and Wales (Company No: 14992011)\nRegistered Office: United House, 39-41 North Road, London, N7 9DP.',
    isDefault: false,
    assignedModules: ['rentals', 'invoices'],
  },
  {
    id: 'entity_taxis_solutions',
    key: 'taxis_solutions',
    fullName: 'Taxis Solutions Ltd',
    tradingName: 'Taxis Solutions',
    registrationNumber: '15124098',
    vatNumber: '453448875',
    officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
    phone: '020 8900 1212',
    email: 'operations@taxissolutions.co.uk',
    website: 'www.taxissolutions.co.uk',
    logoUrl: AIE_SKYLINE_LOGO_BASE64,
    signatureUrl: defaultCompanySignature,
    headerDisclaimer: 'Specialist PCO & Taxi Fleet Management Services',
    footerDisclaimer:
      'Taxis Solutions Ltd, registered in England and Wales (Company No: 15124098)\nRegistered Office: United House, 39-41 North Road, London, N7 9DP.',
    isDefault: false,
    assignedModules: ['rentals', 'invoices'],
  },
  {
    id: 'entity_third_party',
    key: 'third_party',
    fullName: 'Third-Party Fleet Partner',
    tradingName: 'Partner Operations',
    registrationNumber: '',
    vatNumber: '',
    officialAddress: '',
    phone: '',
    email: '',
    website: '',
    logoUrl: '',
    signatureUrl: '',
    headerDisclaimer: 'Authorized Representative / Fleet Brokerage',
    footerDisclaimer: 'Document prepared on behalf of designated third-party principal.',
    isDefault: false,
    assignedModules: [],
  },
];


/**
 * Returns available entity profiles from settings or built-in presets.
 */
export const getAvailableCompanyEntities = (companyDetails?: any): CompanyEntity[] => {
  if (Array.isArray(companyDetails?.entities) && companyDetails.entities.length > 0) {
    return companyDetails.entities;
  }

  // If companyDetails has custom overrides, merge them into the AIE Skyline preset
  if (companyDetails?.fullName || companyDetails?.officialAddress) {
    const customizedSkyline: CompanyEntity = {
      ...PRESET_COMPANY_ENTITIES[0],
      fullName: companyDetails.fullName || PRESET_COMPANY_ENTITIES[0].fullName,
      tradingName: companyDetails.title || companyDetails.tradingName || PRESET_COMPANY_ENTITIES[0].tradingName,
      registrationNumber: companyDetails.registrationNumber || PRESET_COMPANY_ENTITIES[0].registrationNumber,
      vatNumber: companyDetails.vatNumber || PRESET_COMPANY_ENTITIES[0].vatNumber,
      officialAddress: companyDetails.officialAddress || PRESET_COMPANY_ENTITIES[0].officialAddress,
      phone: companyDetails.phone || PRESET_COMPANY_ENTITIES[0].phone,
      email: companyDetails.email || PRESET_COMPANY_ENTITIES[0].email,
      website: companyDetails.website || PRESET_COMPANY_ENTITIES[0].website,
      logoUrl: companyDetails.logoUrl || PRESET_COMPANY_ENTITIES[0].logoUrl,
    };

    return [customizedSkyline, ...PRESET_COMPANY_ENTITIES.slice(1)];
  }

  return PRESET_COMPANY_ENTITIES;
};

/**
 * Merges a chosen entity profile and per-document overrides with company details.
 */
export const buildEffectiveDocumentCompanyDetails = (
  baseCompanyDetails: any,
  selectedEntity: CompanyEntity | null,
  overrides?: Partial<CompanyEntity> & {
    selectedBank?: any;
    paymentQrCodeDataUrl?: string;
    customFooterText?: string;
    customHeaderText?: string;
    includeTrailingTC?: boolean;
    customTermsTitle?: string;
    customTermsText?: string;
    pageTemplateMapping?: PageTemplateMappingConfig;
    [key: string]: any;
  }
) => {
  const entity = selectedEntity || PRESET_COMPANY_ENTITIES[0];
  const allEntities = getAvailableCompanyEntities(baseCompanyDetails);

  // Helper to resolve an entity by key or fall back to the selected document entity
  const resolveEntity = (key?: string) => {
    if (!key) return entity;
    const found = allEntities.find((e) => e.key === key);
    return found || entity;
  };

  const pageMapping = overrides?.pageTemplateMapping || baseCompanyDetails?.pageTemplateMapping;
  const page1Entity = overrides?.pageTemplateMapping?.page1EntityKey
    ? resolveEntity(overrides.pageTemplateMapping.page1EntityKey)
    : entity;
  const page2Entity = overrides?.pageTemplateMapping?.page2EntityKey
    ? resolveEntity(overrides.pageTemplateMapping.page2EntityKey)
    : entity;
  const page3Entity = overrides?.pageTemplateMapping?.page3EntityKey
    ? resolveEntity(overrides.pageTemplateMapping.page3EntityKey)
    : entity;

  const merged = {
    ...baseCompanyDetails,
    ...entity,
    ...overrides,
    fullName: overrides?.fullName || entity.fullName,
    tradingName: overrides?.tradingName || entity.tradingName,
    registrationNumber: overrides?.registrationNumber || entity.registrationNumber,
    vatNumber: overrides?.vatNumber || entity.vatNumber,
    officialAddress: overrides?.officialAddress || entity.officialAddress,
    phone: overrides?.phone || entity.phone,
    email: overrides?.email || entity.email,
    website: overrides?.website || entity.website,
    logoUrl: resolveCompanyLogo(
      {
        key: entity.key,
        fullName: overrides?.fullName || entity.fullName,
        tradingName: overrides?.tradingName || entity.tradingName,
        logoUrl: overrides?.logoUrl || entity.logoUrl || baseCompanyDetails?.logoUrl,
      },
      overrides?.fullName || entity.fullName
    ),
    signatureUrl: overrides?.signatureUrl || entity.signatureUrl || baseCompanyDetails?.signatureUrl,
    customHeaderText: overrides?.customHeaderText || entity.headerDisclaimer || '',
    customFooterText: overrides?.customFooterText || entity.footerDisclaimer || '',
    paymentQrCodeDataUrl: overrides?.paymentQrCodeDataUrl || baseCompanyDetails?.paymentQrCodeDataUrl,
    // Page Template Mapping and Page-Level Entities
    pageTemplateMapping: pageMapping,
    page1Entity,
    page2Entity,
    page3Entity,
    includePage2: pageMapping ? pageMapping.includePage2 && pageMapping.page2Template !== 'none' : true,
    includePage3: pageMapping ? pageMapping.includePage3 && pageMapping.page3Template !== 'none' : overrides?.includeTrailingTC !== false,
  };

  // If a specific bank account was allocated, inject it
  if (overrides?.selectedBank) {
    merged.bankName = overrides.selectedBank.bankName;
    merged.accountNumber = overrides.selectedBank.accountNumber;
    merged.sortCode = overrides.selectedBank.sortCode;
    merged.accountName = overrides.selectedBank.accountName || merged.fullName;
    merged.iban = overrides.selectedBank.iban;
    merged.bic = overrides.selectedBank.bic;
  }

  return merged;
};

/**
 * Returns the configured default entity key for a given document type / module.
 */
export const getDefaultEntityKeyForDocument = (
  documentType: string,
  companyDetails?: any
): string => {
  const mapping: DocumentModuleEntityMapping = {
    ...DEFAULT_MODULE_ENTITY_MAPPING,
    ...(companyDetails?.moduleEntityMapping || {}),
  };

  const doc = (documentType || '').toLowerCase();
  // Requirement 1: Hire Agreement defaults to AIE Skyline Limited (aie_skyline)
  if (doc.includes('hire') || doc.includes('rental') || doc.includes('agreement')) {
    return mapping.rentalsEntityKey || 'aie_skyline';
  }
  if (doc.includes('claim')) {
    return mapping.claimsEntityKey || 'aie_claims';
  }
  if (doc.includes('invoice')) {
    return mapping.invoicesEntityKey || 'aie_skyline';
  }
  if (doc.includes('vehicle')) {
    return mapping.vehiclesEntityKey || 'aie_skyline';
  }

  return mapping.rentalsEntityKey || 'aie_skyline';
};

export interface PageLayoutOption {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export const PAGE_LAYOUT_REGISTRY: Record<
  string,
  {
    page1Options: PageLayoutOption[];
    page2Options: PageLayoutOption[];
    page3Options: PageLayoutOption[];
  }
> = {
  rental_agreement: {
    page1Options: [
      { id: 'standard_rental_agreement', name: 'Standard Vehicle Hire Agreement', description: 'Core agreement with hirer details, vehicle specs, and daily/weekly rate', badge: 'Default' },
      { id: 'executive_chauffeur_agreement', name: 'Executive & Chauffeur Hire Agreement', description: 'Specialized layout for premium private hire & corporate contracts' },
      { id: 'compact_rental_voucher', name: 'Compact Rental Voucher', description: 'Simplified summary card layout' },
    ],
    page2Options: [
      { id: 'checkout_inspection_condition', name: 'Vehicle Condition & Inspection Photos', description: 'Check-out mileage, fuel level, checklist, and high-res damage photos', badge: 'Inspection' },
      { id: 'substitution_fleet_schedule', name: 'Substitution Vehicles Schedule', description: 'Loaner vehicles, hand-over timestamps, and replacement condition' },
      { id: 'detailed_charge_ledger', name: 'Itemized Rate & Additional Charge Schedule', description: 'Full breakdown of delivery, recovery, and insurance charges' },
    ],
    page3Options: [
      { id: 'statutory_hire_terms', name: 'Statutory Terms and Conditions of Hire', description: 'Comprehensive legal clauses covering driver duties, liability & return', badge: 'Legal T&C' },
      { id: 'strict_commercial_terms', name: 'Commercial Fleet & Damage Excess Agreement', description: 'Security deposit, excess deductions, and insurance covenants' },
      { id: 'satisfaction_notice_terms', name: 'Satisfaction Notice & Hirer Sign-off', description: 'Post-delivery acknowledgement of vehicle roadworthiness' },
      { id: 'none', name: 'None (Omit Trailing Page)', description: 'Do not generate trailing page' },
    ],
  },
  rental_invoice: {
    page1Options: [
      { id: 'standard_rental_invoice', name: 'Standard Rental Tax Invoice', description: 'Primary VAT invoice with customer details, hire period, and payment details', badge: 'Default' },
      { id: 'credit_hire_settlement_invoice', name: 'Credit Hire Settlement Invoice', description: 'Formatted for fault insurer subrogation and recovery' },
    ],
    page2Options: [
      { id: 'itemized_line_breakdown', name: 'Itemized Charge & Rates Ledger', description: 'Line items, VAT rates, and daily rate breakdown', badge: 'Ledger' },
      { id: 'payment_history_ledger', name: 'Payment Transactions & Remittance History', description: 'Full transaction history with receipts and remaining balance' },
      { id: 'none', name: 'None (1-Page Invoice)', description: 'Omit secondary page' },
    ],
    page3Options: [
      { id: 'rental_invoice_terms', name: 'Standard Rental Invoice Terms', description: 'Payment terms, bank wire instructions, and dispute timeline', badge: 'Legal T&C' },
      { id: 'strict_net30_terms', name: 'Strict Net-30 Late Payment Recovery Clauses', description: 'Statutory interest under Late Payment of Commercial Debts Act' },
      { id: 'none', name: 'None (Omit Trailing T&C)', description: 'Do not append trailing T&C page' },
    ],
  },
  invoice: {
    page1Options: [
      { id: 'standard_commercial_invoice', name: 'Standard Commercial Invoice', description: 'Complete tax invoice with client billing, itemized summary & bank remittance', badge: 'Default' },
      { id: 'proforma_invoice', name: 'Pro-Forma Quotation & Estimate', description: 'Preliminary quote layout for commercial clients' },
    ],
    page2Options: [
      { id: 'itemized_line_breakdown', name: 'Itemized Line Items & Rate Breakdown', description: 'Expanded line items table with discounts, taxes, and unit prices', badge: 'Breakdown' },
      { id: 'payment_history_ledger', name: 'Historical Receipts & Payments Schedule', description: 'Full audit trail of partial payments and receipts' },
      { id: 'none', name: 'None (Single-Page Layout)', description: 'Fit everything into Page 1' },
    ],
    page3Options: [
      { id: 'commercial_invoice_terms', name: 'Commercial Terms & Late Payment Interest', description: 'Standard commercial invoice terms & late fees', badge: 'Legal T&C' },
      { id: 'strict_net30_terms', name: 'Strict Net-30 & Dispute Resolution Agreement', description: 'Court jurisdiction and debt recovery costs' },
      { id: 'none', name: 'None (Omit Trailing T&C)', description: 'Do not append trailing terms' },
    ],
  },
  condition_of_hire: {
    page1Options: [
      { id: 'standard_claim_record', name: 'Incident & Client Claim Record', description: 'Client personal info, client vehicle, incident time, circumstances, and damage', badge: 'Default' },
      { id: 'litigation_first_report', name: 'Litigation First Report of Loss (FNOL)', description: 'Legal handler first notice of loss dossier' },
    ],
    page2Options: [
      { id: 'third_party_evidence_schedule', name: 'Third Party Details & Vehicle Schedule', description: 'Third-party driver, insurer, policy number, and emergency logs', badge: 'Third Party' },
      { id: 'emergency_incident_log', name: 'Police & Emergency Medical Log', description: 'Officer badge numbers, ambulance service, and accident location details' },
      { id: 'none', name: 'None (Single Page Summary)', description: 'Omit second page' },
    ],
    page3Options: [
      { id: 'claim_management_terms', name: 'Terms & Conditions of Claim Management', description: 'Authority to Act, GDPR compliance, and legal solicitor instructions', badge: 'Legal T&C' },
      { id: 'credit_hire_mitigation_terms', name: 'Credit Hire Mitigation & Storage Terms', description: 'Mitigation statement and credit storage recovery agreement' },
      { id: 'none', name: 'None (Omit Trailing Page)', description: 'Do not append trailing T&Cs' },
    ],
  },
};

/**
 * Returns available page options for a given document type.
 */
export const getPageLayoutOptions = (
  documentType: string
): {
  page1Options: PageLayoutOption[];
  page2Options: PageLayoutOption[];
  page3Options: PageLayoutOption[];
} => {
  const doc = (documentType || '').toLowerCase();
  if (doc.includes('agreement') || (doc.includes('rental') && !doc.includes('invoice'))) {
    return PAGE_LAYOUT_REGISTRY.rental_agreement;
  }
  if (doc.includes('rental_invoice')) {
    return PAGE_LAYOUT_REGISTRY.rental_invoice;
  }
  if (doc.includes('invoice')) {
    return PAGE_LAYOUT_REGISTRY.invoice;
  }
  if (doc.includes('claim') || doc.includes('condition')) {
    return PAGE_LAYOUT_REGISTRY.condition_of_hire;
  }

  return PAGE_LAYOUT_REGISTRY.rental_agreement;
};

/**
 * Returns the default page template mapping for a given document type.
 */
export const getDefaultPageTemplateMapping = (
  documentType: string
): PageTemplateMappingConfig => {
  const options = getPageLayoutOptions(documentType);
  return {
    page1Template: options.page1Options[0]?.id || 'standard_rental_agreement',
    page2Template: options.page2Options[0]?.id || 'checkout_inspection_condition',
    page3Template: options.page3Options[0]?.id || 'statutory_hire_terms',
    includePage2: true,
    includePage3: true,
    page1EntityKey: '',
    page2EntityKey: '',
    page3EntityKey: '',
  };
};

/**
 * Manager-defined default settings per document type.
 */
export interface DocumentTypeDefaultSettings {
  entityKey: string;
  bankAccountId: string;
  page1Template: string;
  page2Template: string;
  page3Template: string;
  includePage2: boolean;
  includePage3: boolean;
  isLocked: boolean;
}

export interface ManagerDocumentDefaults {
  rental: DocumentTypeDefaultSettings;
  claim: DocumentTypeDefaultSettings;
  invoice: DocumentTypeDefaultSettings;
  vehicle: DocumentTypeDefaultSettings;
}

export const DEFAULT_MANAGER_DOCUMENT_DEFAULTS: ManagerDocumentDefaults = {
  rental: {
    entityKey: 'aie_skyline',
    bankAccountId: 'bank_primary_gbp',
    page1Template: 'standard_rental_agreement',
    page2Template: 'checkout_inspection_condition',
    page3Template: 'statutory_hire_terms',
    includePage2: true,
    includePage3: true,
    isLocked: true,
  },
  claim: {
    entityKey: 'aie_claims',
    bankAccountId: 'bank_claims_settlement',
    page1Template: 'standard_claim_record',
    page2Template: 'third_party_evidence_schedule',
    page3Template: 'claim_management_terms',
    includePage2: true,
    includePage3: true,
    isLocked: true,
  },
  invoice: {
    entityKey: 'aie_skyline',
    bankAccountId: 'bank_primary_gbp',
    page1Template: 'standard_commercial_invoice',
    page2Template: 'itemized_line_breakdown',
    page3Template: 'commercial_invoice_terms',
    includePage2: true,
    includePage3: true,
    isLocked: true,
  },
  vehicle: {
    entityKey: 'aie_skyline',
    bankAccountId: 'bank_primary_gbp',
    page1Template: 'standard_rental_agreement',
    page2Template: 'checkout_inspection_condition',
    page3Template: 'statutory_hire_terms',
    includePage2: true,
    includePage3: true,
    isLocked: true,
  },
};

/**
 * Returns the effective manager default configuration for a given document type.
 */
export const getManagerDefaultsForDocType = (
  documentType: string,
  companyDetails?: any
): DocumentTypeDefaultSettings => {
  const doc = (documentType || '').toLowerCase();
  const defaults = companyDetails?.managerDocumentDefaults;

  // Requirement 1: Hire Agreement explicitly defaults to rental defaults (aie_skyline)
  if (doc.includes('hire') || doc.includes('rental') || doc.includes('agreement')) {
    return {
      ...DEFAULT_MANAGER_DOCUMENT_DEFAULTS.rental,
      ...(defaults?.rental || {}),
      entityKey: 'aie_skyline',
    };
  }

  if (doc.includes('claim') || doc.includes('condition')) {
    return {
      ...DEFAULT_MANAGER_DOCUMENT_DEFAULTS.claim,
      ...(defaults?.claim || {}),
    };
  }
  if (doc.includes('invoice')) {
    return {
      ...DEFAULT_MANAGER_DOCUMENT_DEFAULTS.invoice,
      ...(defaults?.invoice || {}),
    };
  }
  if (doc.includes('vehicle')) {
    return {
      ...DEFAULT_MANAGER_DOCUMENT_DEFAULTS.vehicle,
      ...(defaults?.vehicle || {}),
    };
  }
  // Default: rental
  return {
    ...DEFAULT_MANAGER_DOCUMENT_DEFAULTS.rental,
    ...(defaults?.rental || {}),
  };
};

