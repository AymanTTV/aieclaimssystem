// src/utils/legalDocumentUtils.ts
import { format } from 'date-fns';
import defaultSkylineLogo from '../assets/logo.png';
import aieClaimsLogo from '../assets/aieclaim.png';
import { getAvailableCompanyEntities, CompanyEntity } from './entityBranding';
import { AIE_SKYLINE_LOGO_BASE64, AIE_CLAIMS_LOGO_BASE64, resolveCompanyLogo } from './companyLogoResolver';

/**
 * Extracts the explicit Hire Start Date & Time (commencement date and execution timestamp)
 * regardless of when the document is signed or generated.
 * Automatically backdates to match the exact "Start Date" and "Start Time" configured
 * on the rental record (e.g., if Hire Start is 02/10/2026 at 02:57, Date: 02/10/2026 02:57).
 */
export const getHireCommencementDate = (source: any): Date => {
  if (!source) return new Date();

  // Prioritize original hire start date / commencement date
  const candidate = 
    source.originalStartDate ||
    source.hireDetails?.startDate ||
    source.rental?.originalStartDate ||
    source.rental?.startDate ||
    source.startDate ||
    source.incidentDetails?.date ||
    source.createdAt;

  let d = new Date();

  if (candidate instanceof Date && !isNaN(candidate.getTime())) {
    d = new Date(candidate.getTime());
  } else if (candidate && typeof candidate.toDate === 'function') {
    const fromSnap = candidate.toDate();
    if (!isNaN(fromSnap.getTime())) d = new Date(fromSnap.getTime());
  } else if (typeof candidate === 'string' || typeof candidate === 'number') {
    const parsed = new Date(candidate);
    if (!isNaN(parsed.getTime())) d = parsed;
  }

  // Extract explicit Start Time if present on rental, claim, or hireDetails
  const explicitTime = 
    source.startTime ||
    source.rental?.startTime ||
    source.hireDetails?.startTime ||
    source.incidentDetails?.time;

  if (explicitTime && typeof explicitTime === 'string') {
    const parts = explicitTime.trim().split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(minutes)) {
        d.setHours(hours, minutes, 0, 0);
      }
    }
  }

  return d;
};

/**
 * Formats the agreement execution timestamp backdated to Hire Start Date/Time:
 * e.g. "02/10/2026 02:57"
 */
export const formatExecutionDateTime = (source: any, pattern: string = 'dd/MM/yyyy HH:mm'): string => {
  try {
    const d = getHireCommencementDate(source);
    return format(d, pattern);
  } catch {
    return format(new Date(), pattern);
  }
};

/**
 * Formats the hire commencement date as dd/MM/yyyy HH:mm (or custom pattern).
 * Defaults to 'dd/MM/yyyy HH:mm' for precise agreement execution timestamp.
 */
export const formatHireCommencementDate = (source: any, pattern: string = 'dd/MM/yyyy HH:mm'): string => {
  try {
    const d = getHireCommencementDate(source);
    return format(d, pattern);
  } catch {
    return format(new Date(), pattern);
  }
};

export interface VehicleLegalDetails {
  registration: string;
  make: string;
  model: string;
  makeModel: string;
  formatted: string;
}

/**
 * Safely extracts vehicle registration, make, and model across any rental,
 * claim, or vehicle document payload, providing unified access.
 */
export const getVehicleDetails = (source: any): VehicleLegalDetails => {
  if (!source) {
    return { registration: 'N/A', make: '', model: '', makeModel: '', formatted: 'N/A' };
  }

  const registration =
    source.hireDetails?.vehicle?.registration ||
    source.hireDetails?.vehicle?.registrationNumber ||
    source.clientVehicle?.registration ||
    source.clientVehicle?.registrationNumber ||
    source.vehicle?.registrationNumber ||
    source.vehicle?.registration ||
    source.rental?.vehicleRegistration ||
    source.rental?.registrationNumber ||
    source.vehicleRegistration ||
    source.registrationNumber ||
    source.registration ||
    'N/A';

  const make =
    source.hireDetails?.vehicle?.make ||
    source.clientVehicle?.make ||
    source.vehicle?.make ||
    source.rental?.vehicleMake ||
    source.vehicleMake ||
    source.make ||
    '';

  const model =
    source.hireDetails?.vehicle?.model ||
    source.clientVehicle?.model ||
    source.vehicle?.model ||
    source.rental?.vehicleModel ||
    source.vehicleModel ||
    source.model ||
    '';

  const makeModel = [make, model].filter(Boolean).join(' ').trim();
  const formatted = makeModel ? `${registration} (${makeModel})` : registration;

  return { registration, make, model, makeModel, formatted };
};

/**
 * Extracts active Corporate Entity Profile details from an entity object or companyDetails payload.
 */
export const extractActiveCorporateEntityProfile = (
  entityOrCompanyDetails?: any
): {
  companyName: string;
  claimsTeam: string;
  companyNumber: string;
  vatNumber: string;
  companyAddress: string;
  phone: string;
  email: string;
  website: string;
} => {
  const targetKey = String(
    entityOrCompanyDetails?.corporateEntityKey ||
    entityOrCompanyDetails?.rental?.corporateEntityKey ||
    entityOrCompanyDetails?.claim?.rental?.corporateEntityKey ||
    entityOrCompanyDetails?.claim?.corporateEntityKey ||
    entityOrCompanyDetails?.entityKey ||
    entityOrCompanyDetails?.key ||
    entityOrCompanyDetails?.page3Entity?.key ||
    entityOrCompanyDetails?.page1Entity?.key ||
    ''
  ).toLowerCase().trim();

  const targetName = String(
    entityOrCompanyDetails?.corporateEntityName ||
    entityOrCompanyDetails?.rental?.corporateEntityName ||
    entityOrCompanyDetails?.claim?.rental?.corporateEntityName ||
    entityOrCompanyDetails?.claim?.corporateEntityName ||
    entityOrCompanyDetails?.fullName ||
    entityOrCompanyDetails?.tradingName ||
    entityOrCompanyDetails?.name ||
    ''
  ).trim();

  const allEntities = getAvailableCompanyEntities(entityOrCompanyDetails);
  const matchedEntity = allEntities.find((e) => {
    if (targetKey && (e.key.toLowerCase() === targetKey || e.id.toLowerCase() === targetKey)) return true;
    if (targetKey && (targetKey.includes('sayarah') && e.key.includes('sayarah'))) return true;
    if (targetName && (e.fullName.toLowerCase() === targetName.toLowerCase() || e.tradingName.toLowerCase() === targetName.toLowerCase())) return true;
    if (targetName && targetName.toLowerCase().includes('sayarah') && e.fullName.toLowerCase().includes('sayarah')) return true;
    return false;
  });

  const hasExplicitEntityTarget = Boolean(
    entityOrCompanyDetails?.corporateEntityKey ||
    entityOrCompanyDetails?.rental?.corporateEntityKey ||
    entityOrCompanyDetails?.claim?.rental?.corporateEntityKey ||
    entityOrCompanyDetails?.claim?.corporateEntityKey ||
    entityOrCompanyDetails?.corporateEntityName ||
    entityOrCompanyDetails?.rental?.corporateEntityName ||
    entityOrCompanyDetails?.claim?.rental?.corporateEntityName ||
    entityOrCompanyDetails?.claim?.corporateEntityName
  );

  const entity =
    (hasExplicitEntityTarget && matchedEntity) ? matchedEntity : (
      entityOrCompanyDetails?.page3Entity ||
      entityOrCompanyDetails?.page1Entity ||
      entityOrCompanyDetails?.page2Entity ||
      matchedEntity ||
      entityOrCompanyDetails?.assignedEntity ||
      entityOrCompanyDetails?.corporateEntity ||
      entityOrCompanyDetails?.matchedEntity ||
      entityOrCompanyDetails
    );

  const rawCompanyName =
    (hasExplicitEntityTarget && (targetName || matchedEntity?.fullName)) ||
    entity?.fullName ||
    entity?.corporateEntityName ||
    entity?.name ||
    entity?.tradingName ||
    targetName ||
    matchedEntity?.fullName ||
    entityOrCompanyDetails?.corporateEntityName ||
    entityOrCompanyDetails?.fullName ||
    entityOrCompanyDetails?.name ||
    'AIE Skyline Limited';

  // Normalize Sayarah Ijaraha naming variation to Sayarah Ijarah Ltd / Sayarah Ijarah Limited
  let companyName = rawCompanyName;
  if (/^Sayarah\s+Ijaraha\s+Limited$/i.test(companyName)) {
    companyName = targetName && /Sayarah\s+Ijarah\s+(?:Ltd|Limited)/i.test(targetName) ? targetName : 'Sayarah Ijarah Ltd';
  } else if (/^Sayarah\s+Ijaraha\b/i.test(companyName)) {
    companyName = companyName.replace(/^Sayarah\s+Ijaraha\b/i, 'Sayarah Ijarah');
  }

  // Calculate Claims Team dynamically based on active corporate entity
  let claimsTeam = entity?.claimsTeam || matchedEntity?.claimsTeam || entityOrCompanyDetails?.claimsTeam;
  if (!claimsTeam || claimsTeam.includes('Premier Fleet') || claimsTeam.includes('Islamic Vehicle') || claimsTeam.includes('Accident Management') || claimsTeam.includes('Specialist PCO')) {
    const rawClean = (entity?.tradingName || matchedEntity?.tradingName || companyName || '')
      .replace(/\s+(?:limited|ltd\.?)$/i, '')
      .replace(/Ijaraha\b/i, 'Ijarah')
      .trim();
    if (/claims$/i.test(rawClean)) {
      claimsTeam = `${rawClean} Team`;
    } else {
      claimsTeam = `${rawClean} Claims Team`;
    }
  }

  const lowerName = companyName.toLowerCase();

  const companyNumber =
    entity?.registrationNumber ||
    entity?.companyNumber ||
    entity?.companyRegistration ||
    matchedEntity?.registrationNumber ||
    entityOrCompanyDetails?.registrationNumber ||
    entityOrCompanyDetails?.companyNumber ||
    (lowerName.includes('sayarah')
      ? '14992011'
      : lowerName.includes('claims') && !lowerName.includes('skyline')
      ? '15616639'
      : lowerName.includes('cabs')
      ? '14882190'
      : lowerName.includes('taxis')
      ? '15124098'
      : '14592207');

  const vatNumber =
    entity?.vatNumber ||
    entity?.companyVat ||
    entity?.vat ||
    matchedEntity?.vatNumber ||
    entityOrCompanyDetails?.vatNumber ||
    entityOrCompanyDetails?.companyVat ||
    '453448875';

  const companyAddress =
    entity?.officialAddress ||
    entity?.address ||
    matchedEntity?.officialAddress ||
    entityOrCompanyDetails?.officialAddress ||
    entityOrCompanyDetails?.address ||
    'United House, 39-41 North Road, London, N7 9DP';

  let phone =
    entity?.phone ||
    entity?.telephone ||
    matchedEntity?.phone ||
    entityOrCompanyDetails?.phone ||
    entityOrCompanyDetails?.telephone;
  if (!phone || phone === '020 1234 5678') {
    if (lowerName.includes('sayarah')) {
      phone = '020 8050 5337';
    } else if (lowerName.includes('claims') && !lowerName.includes('skyline')) {
      phone = '+442080505337';
    } else if (lowerName.includes('cabs') || lowerName.includes('taxis')) {
      phone = '020 8900 1212';
    } else {
      phone = phone || '020 1234 5678';
    }
  }

  let email =
    entity?.email ||
    matchedEntity?.email ||
    entityOrCompanyDetails?.email;
  if (!email || email === 'info@aieskyline.co.uk') {
    if (lowerName.includes('sayarah')) {
      email = 'info@sayarahijarah.co.uk';
    } else if (lowerName.includes('claims') && !lowerName.includes('skyline')) {
      email = 'claims@aieclaims.co.uk';
    } else if (lowerName.includes('cabs')) {
      email = 'dispatch@skylinecabs.co.uk';
    } else if (lowerName.includes('taxis')) {
      email = 'operations@taxissolutions.co.uk';
    } else {
      email = email || 'info@aieskyline.co.uk';
    }
  }

  let website =
    entity?.website ||
    matchedEntity?.website ||
    entityOrCompanyDetails?.website ||
    '';
  if (!website || website === 'www.aieskyline.co.uk') {
    if (lowerName.includes('sayarah')) {
      website = 'www.sayarahijarah.co.uk';
    } else if (lowerName.includes('claims') && !lowerName.includes('skyline')) {
      website = 'www.aieclaims.co.uk';
    } else if (lowerName.includes('skyline cabs')) {
      website = 'www.skylinecabs.co.uk';
    } else if (lowerName.includes('taxis')) {
      website = 'www.taxissolutions.co.uk';
    } else {
      website = website || 'www.aieskyline.co.uk';
    }
  }

  return {
    companyName,
    claimsTeam,
    companyNumber,
    vatNumber,
    companyAddress,
    phone,
    email,
    website,
  };
};

/**
 * Dynamic Corporate Entity Placeholders & Auto-Sanitization Engine.
 * 
 * 1. Automatic Static String Parser & Replacer:
 *    • Automatically replaces static legacy strings matching:
 *      - "AIE Skyline Claims Team", "AIE Claims Team", "AIE Claims Department", "AIE dispatch team" with {{claims_team}}
 *      - "AIE Skyline Limited", "AIE Skyline Ltd", "AIE Claims Ltd", "AIE Claims LTD" with {{company_name}}
 *      - "www.aieskyline.co.uk", "www.aieclaims.co.uk" with {{website}}
 *      - Static emails with {{company_email}}
 *      - Static phone numbers with {{company_phone}}
 * 
 * 2. Dynamic Entity Variables Mapping:
 *    • {{company_name}} -> Dynamic Entity Name (e.g. Sayarah Ijarah Ltd / AIE Skyline Limited / AIE Claims Ltd)
 *    • {{claims_team}} -> Dynamic Claims Team Name (e.g. Sayarah Ijarah Claims Team / AIE Claims Team)
 *    • {{website}} -> Dynamic Company Website (e.g. www.sayarahijarah.co.uk / www.aieskyline.co.uk)
 *    • {{company_email}} -> Dynamic Official Email
 *    • {{company_phone}} -> Dynamic Official Phone Number
 *    • {{company_number}} -> Dynamic Registration Number
 *    • {{vat_number}} -> Dynamic VAT Number
 *    • {{company_address}} -> Dynamic Registered Address
 */
export const sanitizeAndInterpolateTerms = (
  text: string,
  entityOrCompanyDetails?: any
): string => {
  if (!text || typeof text !== 'string') return '';

  const profile = extractActiveCorporateEntityProfile(entityOrCompanyDetails);
  const { companyName, claimsTeam, companyNumber, vatNumber, companyAddress, phone, email, website } = profile;

  let result = text;

  // ═══════════════════════════════════════════════════════════════════
  // 1. AUTOMATIC STATIC STRING PARSER & REPLACER
  // ═══════════════════════════════════════════════════════════════════

  // Claims Team variations (exact matches and variations -> {{claims_team}})
  result = result.replace(/\bAIE\s+Skyline\s+Claims\s+Team\b/gi, '{{claims_team}}');
  result = result.replace(/\bAIE\s+Claims\s+Team\b/gi, '{{claims_team}}');
  result = result.replace(/\bAIE\s+Claims\s+Department\b/gi, '{{claims_team}}');
  result = result.replace(/\bAIE\s+fleet\s+management\s+dispatch\s+team\b/gi, '{{claims_team}}');
  result = result.replace(/\bthe\s+AIE\s+dispatch\s+team\b/gi, 'the {{claims_team}}');
  result = result.replace(/\bAIE\s+dispatch\s+team\b/gi, '{{claims_team}}');
  result = result.replace(/\bSayarah\s+Ijaraha?\s+Claims\s+Team\b/gi, '{{claims_team}}');
  result = result.replace(/\bSkyline\s+Cabs\s+Claims\s+Team\b/gi, '{{claims_team}}');
  result = result.replace(/\bTaxis\s+Solutions\s+Claims\s+Team\b/gi, '{{claims_team}}');

  // Company Name variations (exact matches and variations -> {{company_name}})
  result = result.replace(/\bAIE\s+Skyline\s+Limited\b/gi, '{{company_name}}');
  result = result.replace(/\bAIE\s+Skyline\s+Ltd\.?\b/gi, '{{company_name}}');
  result = result.replace(/\bAIE\s+Claims\s+Limited\b/gi, '{{company_name}}');
  result = result.replace(/\bAIE\s+Claims\s+LTD\b/g, '{{company_name}}');
  result = result.replace(/\bAIE\s+Claims\s+Ltd\.?\b/gi, '{{company_name}}');
  result = result.replace(/\bSayarah\s+Ijaraha?\s+Limited\b/gi, '{{company_name}}');
  result = result.replace(/\bSayarah\s+Ijaraha?\s+Ltd\.?\b/gi, '{{company_name}}');
  result = result.replace(/\bSkyline\s+Cabs\s+&\s+Transportation\s+Ltd\.?\b/gi, '{{company_name}}');
  result = result.replace(/\bTaxis\s+Solutions\s+Ltd\.?\b/gi, '{{company_name}}');

  // Website variations (exact matches and variations -> {{website}})
  result = result.replace(/(?:https?:\/\/)?www\.aieskyline\.co\.uk\b/gi, '{{website}}');
  result = result.replace(/(?:https?:\/\/)?www\.aieclaims\.co\.uk\b/gi, '{{website}}');
  result = result.replace(/(?:https?:\/\/)?www\.sayarahijaraha?\.co\.uk\b/gi, '{{website}}');
  result = result.replace(/(?:https?:\/\/)?www\.skylinecabs\.co\.uk\b/gi, '{{website}}');
  result = result.replace(/(?:https?:\/\/)?www\.taxissolutions\.co\.uk\b/gi, '{{website}}');

  // Email variations -> {{company_email}}
  result = result.replace(/\b(?:compliance|info|accounts|ops)@aieskyline\.co\.uk\b/gi, '{{company_email}}');
  result = result.replace(/\bclaims@aieclaims\.co\.uk\b/gi, '{{company_email}}');
  result = result.replace(/\b(?:info|compliance)@sayarahijaraha?\.co\.uk\b/gi, '{{company_email}}');
  result = result.replace(/\bdispatch@skylinecabs\.co\.uk\b/gi, '{{company_email}}');
  result = result.replace(/\boperations@taxissolutions\.co\.uk\b/gi, '{{company_email}}');

  // Phone variations -> {{company_phone}}
  result = result.replace(/\b020\s*1234\s*5678\b/g, '{{company_phone}}');
  result = result.replace(/\+44\s*20\s*8050\s*5337\b/g, '{{company_phone}}');
  result = result.replace(/\b020\s*8050\s*5337\b/g, '{{company_phone}}');
  result = result.replace(/\b020\s*8900\s*1212\b/g, '{{company_phone}}');

  // ═══════════════════════════════════════════════════════════════════
  // 2. DYNAMIC ENTITY VARIABLES MAPPING & REPLACEMENT
  // ═══════════════════════════════════════════════════════════════════

  // • {{company_name}} -> Dynamic Entity Name (e.g. Sayarah Ijarah Ltd / AIE Skyline Limited / AIE Claims Ltd)
  result = result.replace(/\{{1,3}\s*(?:company_name|companyName|company)\s*\}{1,3}/gi, companyName);

  // • {{claims_team}} -> Dynamic Claims Team Name (e.g. Sayarah Ijarah Claims Team / AIE Claims Team)
  result = result.replace(/\{{1,3}\s*(?:claims_team|claimsTeam|claim_team|claimTeam|dispatch_team|dispatchTeam)\s*\}{1,3}/gi, claimsTeam);

  // • {{website}} -> Dynamic Company Website (e.g. www.sayarahijarah.co.uk / www.aieskyline.co.uk)
  result = result.replace(/\{{1,3}\s*(?:website|company_website|companyWebsite|web)\s*\}{1,3}/gi, website);

  // • {{company_email}} -> Dynamic Official Email
  result = result.replace(/\{{1,3}\s*(?:company_email|companyEmail|email|official_email|contact_email)\s*\}{1,3}/gi, email);

  // • {{company_phone}} -> Dynamic Official Phone Number
  result = result.replace(/\{{1,3}\s*(?:company_phone|companyPhone|phone|company_tel|companyTel|tel|official_phone)\s*\}{1,3}/gi, phone);

  // • {{company_number}} -> Dynamic Registration Number
  result = result.replace(
    /\{{1,3}\s*(?:company_number|companyNumber|company_registration|companyRegistration|registration_number|registrationNumber|company_reg|companyReg)\s*\}{1,3}/gi,
    companyNumber
  );

  // • {{vat_number}} -> Dynamic VAT Number
  result = result.replace(
    /\{{1,3}\s*(?:vat_number|vatNumber|company_vat|companyVat|vat)\s*\}{1,3}/gi,
    vatNumber
  );

  // • {{company_address}} -> Dynamic Registered Address
  result = result.replace(
    /\{{1,3}\s*(?:company_address|companyAddress|registered_address|registeredAddress|company_official_address)\s*\}{1,3}/gi,
    companyAddress
  );

  // Auto-update legacy company registration numbers if active registration number differs
  if (companyNumber && companyNumber !== '14592207' && companyNumber !== '15616639') {
    result = result.replace(/(Company\s+(?:No|Number|Registration)[:\s]+)(?:14592207|15616639)\b/gi, `$1${companyNumber}`);
    result = result.replace(/(Reg(?:istration)?[:\s]+)(?:14592207|15616639)\b/gi, `$1${companyNumber}`);
  }

  return result;
};

/**
 * Interpolates variables in legal terms text (e.g. {company_name}, {hirerName}, {vehicleReg}, etc.)
 * Automatically applies dynamic corporate entity placeholder replacement and legacy name sanitization.
 */
export const parseLegalVariables = (template: string, vars: Record<string, any>): string => {
  if (!template || typeof template !== 'string') return '';

  let result = template;

  // Extract company info from vars to run dynamic placeholders and auto-sanitization
  const companyName = vars.company_name || vars.companyName || vars.company;
  const companyNumber =
    vars.company_number ||
    vars.companyNumber ||
    vars.companyRegistration ||
    vars.company_registration ||
    vars.registrationNumber;
  const vatNumber = vars.vat_number || vars.vatNumber || vars.companyVat || vars.company_vat;
  const companyAddress = vars.company_address || vars.companyAddress || vars.registeredAddress;
  const phone = vars.companyPhone || vars.company_phone || vars.phone;
  const email = vars.companyEmail || vars.company_email || vars.email;
  const website = vars.website || vars.company_website || vars.companyWebsite;
  const claimsTeam = vars.claims_team || vars.claimsTeam;

  result = sanitizeAndInterpolateTerms(result, {
    fullName: companyName,
    registrationNumber: companyNumber,
    vatNumber,
    officialAddress: companyAddress,
    phone,
    email,
    website,
    claimsTeam,
  });

  for (const [key, val] of Object.entries(vars)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val);

    // Replace {key}, {{key}}, {{{key}}}, {KEY}, {{KEY}}, etc.
    const regex = new RegExp(`\\{{1,3}\\s*${key}\\s*\\}{1,3}`, 'gi');
    result = result.replace(regex, strVal);
  }

  return result;
};

/**
 * Splits legal text into paragraphs safely for React-PDF rendering,
 * ensuring no text truncation or single large block overflow.
 */
export const splitParagraphs = (text: string): string[] => {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/\r?\n+/)
    .map(p => p.trim())
    .filter(Boolean);
};

/**
 * Parses official address into two components for 2-line footer rendering:
 * Line 1 address part (e.g., "United House.")
 * Line 2 address part (e.g., "39-41 North Road, London, N7 9DP.")
 */
export const parseAddressForFooter = (rawAddress?: string): { addrLine1: string; addrLine2: string } => {
  const fallbackLine1 = 'United House.';
  const fallbackLine2 = '39-41 North Road, London, N7 9DP.';

  if (!rawAddress || typeof rawAddress !== 'string' || !rawAddress.trim()) {
    return { addrLine1: fallbackLine1, addrLine2: fallbackLine2 };
  }

  const cleaned = rawAddress.trim();
  const newlineParts = cleaned.split(/\r?\n/).map(p => p.trim()).filter(Boolean);

  if (newlineParts.length >= 2) {
    const part1 = newlineParts[0].replace(/[,.]+$/, '') + '.';
    const part2 = newlineParts.slice(1).join(', ').replace(/[,.]+$/, '') + '.';
    return { addrLine1: part1, addrLine2: part2 };
  }

  // Single-line address (e.g. "United House, 39-41 North Road, London, N7 9DP")
  const unitedHouseMatch = cleaned.match(/^(United House[.]?)[,\s]*(.+)$/i);
  if (unitedHouseMatch) {
    const p1 = unitedHouseMatch[1].trim().replace(/[,.]+$/, '') + '.';
    const p2 = unitedHouseMatch[2].trim().replace(/[,.]+$/, '') + '.';
    return { addrLine1: p1, addrLine2: p2 };
  }

  const delimiterMatch = cleaned.match(/^([^,.]+)[,.](.+)$/);
  if (delimiterMatch) {
    const p1 = delimiterMatch[1].trim().replace(/[,.]+$/, '') + '.';
    const p2 = delimiterMatch[2].trim().replace(/[,.]+$/, '') + '.';
    return { addrLine1: p1, addrLine2: p2 };
  }

  return { addrLine1: cleaned.replace(/[,.]+$/, '') + '.', addrLine2: '' };
};

export const AIE_CLAIMS_COMPANY_DETAILS = {
  fullName: 'AIE Claims LTD',
  name: 'AIE Claims Ltd.',
  registrationNumber: '15616639',
  officialAddress: 'United House, 39-41 North Road, London, N7 9DP',
  addressLine1: 'United House, 39-41 North Road,',
  addressLine2: 'London, N7 9DP',
  phone: '+442080505337',
  email: 'claims@aieclaims.co.uk',
};

export const AIE_CLAIMS_FOOTER_TEXT =
  'AIE Claims Ltd. Registered in England and Wales with company registration number: 15616639, Registered office address: United House, 39-41 North Road, London, N7 9DP';

export const formatClaimCompanyFooter = (_companyDetails?: any): string => {
  return AIE_CLAIMS_FOOTER_TEXT;
};

/**
 * Formats company legal details into a clean, balanced 2-row footer:
 * Row 1: "AIE Skyline Limited, registered in England and Wales (Company No: 14592207)"
 * Row 2: "Registered Office: United House, 39-41 North Road, London, N7 9DP. | VAT No: 453448875"
 */
export const formatInlineCompanyFooter = (companyDetails?: any): string => {
  if (companyDetails?.customFooterText && typeof companyDetails.customFooterText === 'string' && companyDetails.customFooterText.trim()) {
    return companyDetails.customFooterText.trim();
  }

  if (
    companyDetails?.isClaim ||
    companyDetails?.useAieClaims ||
    (companyDetails?.fullName?.toLowerCase().includes('claim') && !companyDetails?.fullName?.toLowerCase().includes('skyline')) ||
    (companyDetails?.name?.toLowerCase().includes('claim') && !companyDetails?.name?.toLowerCase().includes('skyline'))
  ) {
    return AIE_CLAIMS_FOOTER_TEXT;
  }

  const name = companyDetails?.fullName || companyDetails?.name || 'AIE Skyline Limited';
  const regNo = companyDetails?.registrationNumber || '14592207';
  const vat = companyDetails?.vatNumber || '453448875';

  let rawAddress = companyDetails?.officialAddress;
  let fullAddress = 'United House, 39-41 North Road, London, N7 9DP.';
  if (rawAddress && typeof rawAddress === 'string' && rawAddress.trim()) {
    const cleaned = rawAddress
      .trim()
      .split(/\r?\n/)
      .map(p => p.trim())
      .filter(Boolean)
      .join(', ')
      .replace(/,\s*,/g, ', ')
      .replace(/[,.]+$/, '') + '.';
    fullAddress = cleaned;
  }

  // Row 1: Company entity and registration number
  const row1 = regNo ? `${name}, registered in England and Wales (Company No: ${regNo})` : name;

  // Row 2: Registered office and VAT number
  const row2Parts: string[] = [];
  if (fullAddress) {
    row2Parts.push(`Registered Office: ${fullAddress}`);
  }
  if (vat) {
    row2Parts.push(`VAT No: ${vat}`);
  }
  const row2 = row2Parts.join(' | ');

  if (row1 && row2) {
    return `${row1}\n${row2}`;
  }
  return row1 || row2;
};

export const DEFAULT_INLINE_COMPANY_FOOTER =
  'AIE Skyline Limited, registered in England and Wales (Company No: 14592207)\nRegistered Office: United House, 39-41 North Road, London, N7 9DP. | VAT No: 453448875';

export const isValidPdfImageSrc = (v: any): v is string => {
  return typeof v === 'string' && v.trim().length > 0 && !v.includes('[object') && !v.startsWith('blob:null');
};

export interface ResolvedPdfBranding {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyLogo: string;
  footerText: string;
  entityKey: string;
  website?: string;
  claimsTeam?: string;
  companyNumber?: string;
  vatNumber?: string;
}

/**
 * Resolves the dynamic entity profile, name, contact info, and logo for any PDF document.
 * Fully supports all corporate entities (Sayarah Ijarah, AIE Skyline, AIE Claims, Skyline Cabs, Taxis Solutions, etc.)
 */
export const getCompanyBrandingForPdf = (
  companyDetails: any,
  defaultKey: string = 'aie_skyline'
): ResolvedPdfBranding => {
  const profile = extractActiveCorporateEntityProfile(companyDetails);
  const rawKey = String(
    companyDetails?.corporateEntityKey ||
    companyDetails?.rental?.corporateEntityKey ||
    companyDetails?.entityKey ||
    (companyDetails as any)?.key ||
    defaultKey
  ).toLowerCase();

  const allEntities = getAvailableCompanyEntities(companyDetails);
  const matchedEntity = allEntities.find((e) => {
    if (rawKey && (e.key.toLowerCase() === rawKey || e.id.toLowerCase() === rawKey)) return true;
    if (rawKey && rawKey.includes('sayarah') && e.key.includes('sayarah')) return true;
    if (e.fullName.toLowerCase() === profile.companyName.toLowerCase()) return true;
    return false;
  });

  const logo = resolveCompanyLogo(
    {
      key: matchedEntity?.key || rawKey,
      fullName: profile.companyName,
      tradingName: matchedEntity?.tradingName,
      logoUrl: companyDetails?.logoUrl || matchedEntity?.logoUrl,
    },
    profile.companyName
  );

  const footerText =
    companyDetails?.footerDisclaimer ||
    matchedEntity?.footerDisclaimer ||
    formatInlineCompanyFooter({
      fullName: profile.companyName,
      registrationNumber: profile.companyNumber,
      vatNumber: profile.vatNumber,
      officialAddress: profile.companyAddress,
    });

  return {
    entityKey: matchedEntity?.key || rawKey,
    companyName: profile.companyName,
    companyAddress: profile.companyAddress,
    companyPhone: profile.phone,
    companyEmail: profile.email,
    companyLogo: logo,
    footerText,
    website: profile.website,
    claimsTeam: profile.claimsTeam,
    companyNumber: profile.companyNumber,
    vatNumber: profile.vatNumber,
  };
};


