// src/utils/legalDocumentUtils.ts
import { format } from 'date-fns';

/**
 * Extracts the explicit Hire Start Date (commencement date) regardless of when 
 * the document is signed, when the hire completed, or when the record was updated.
 * Prevents post-hire completion dates from stamping onto historical documents.
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

  if (!candidate) return new Date();

  if (candidate instanceof Date && !isNaN(candidate.getTime())) {
    return candidate;
  }

  if (typeof candidate.toDate === 'function') {
    const d = candidate.toDate();
    if (!isNaN(d.getTime())) return d;
  }

  if (typeof candidate === 'string' || typeof candidate === 'number') {
    const d = new Date(candidate);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
};

/**
 * Formats the hire commencement date as dd/MM/yyyy.
 */
export const formatHireCommencementDate = (source: any, pattern: string = 'dd/MM/yyyy'): string => {
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
 * Interpolates variables in legal terms text (e.g. {companyName}, {hirerName}, {vehicleReg}, etc.)
 */
export const parseLegalVariables = (template: string, vars: Record<string, any>): string => {
  if (!template || typeof template !== 'string') return '';

  let result = template;

  for (const [key, val] of Object.entries(vars)) {
    if (val === undefined || val === null) continue;
    const strVal = String(val);

    // Replace {key}, {{key}}, {KEY}, {{KEY}}
    const regex = new RegExp(`\\{\\{?\\s*${key}\\s*\\}\\}?`, 'gi');
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

/**
 * Formats company legal details into a clean, balanced 2-row footer:
 * Row 1: "AIE Skyline Limited, registered in England and Wales (Company No: 14592207)"
 * Row 2: "Registered Office: United House, 39-41 North Road, London, N7 9DP. | VAT No: 453448875"
 */
export const formatInlineCompanyFooter = (companyDetails?: any): string => {
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
  const row1 = `${name}, registered in England and Wales (Company No: ${regNo})`;

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


