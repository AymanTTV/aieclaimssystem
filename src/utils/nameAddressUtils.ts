// src/utils/nameAddressUtils.ts

/**
 * Splits a full name string into First Name, Middle Name, and Last Name.
 */
export function splitFullName(fullName: string = ''): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', middleName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], middleName: '', lastName: '' };
  if (parts.length === 2) return { firstName: parts[0], middleName: '', lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

/**
 * Combines First Name, Middle Name, and Last Name into a full name string.
 */
export function combineFullName(
  firstName: string = '',
  middleName: string = '',
  lastName: string = ''
): string {
  return [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

/**
 * Splits a full address string into Building Name / Flat Number, Street Name, Town / City, Postcode, Country.
 */
export function splitFullAddress(fullAddress: string = ''): {
  buildingFlat: string;
  streetName: string;
  townCity: string;
  postcode: string;
  country: string;
} {
  if (!fullAddress) {
    return { buildingFlat: '', streetName: '', townCity: '', postcode: '', country: '' };
  }

  const parts = fullAddress.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return { buildingFlat: '', streetName: '', townCity: '', postcode: '', country: '' };
  }
  if (parts.length === 1) {
    return { buildingFlat: parts[0], streetName: '', townCity: '', postcode: '', country: '' };
  }
  if (parts.length === 2) {
    return { buildingFlat: parts[0], streetName: parts[1], townCity: '', postcode: '', country: '' };
  }
  if (parts.length === 3) {
    return { buildingFlat: parts[0], streetName: parts[1], townCity: parts[2], postcode: '', country: '' };
  }
  if (parts.length === 4) {
    return { buildingFlat: parts[0], streetName: parts[1], townCity: parts[2], postcode: parts[3], country: '' };
  }
  return {
    buildingFlat: parts[0],
    streetName: parts[1],
    townCity: parts[2],
    postcode: parts[3],
    country: parts.slice(4).join(', '),
  };
}

/**
 * Combines Building Name / Flat Number, Street Name, Town / City, Postcode, and Country into a formatted address string.
 */
export function combineFullAddress(
  buildingFlat: string = '',
  streetName: string = '',
  townCity: string = '',
  postcode: string = '',
  country: string = ''
): string {
  return [
    buildingFlat.trim(),
    streetName.trim(),
    townCity.trim(),
    postcode.trim(),
    country.trim(),
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Resolves split name fields (firstName, middleName, lastName) from any object containing
 * individual fields or a combined name/fullName string.
 */
export function resolveNameFields(entity?: {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
}): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  if (!entity) {
    return { firstName: '', middleName: '', lastName: '' };
  }
  if (entity.firstName || entity.middleName || entity.lastName) {
    return {
      firstName: entity.firstName || '',
      middleName: entity.middleName || '',
      lastName: entity.lastName || '',
    };
  }
  const rawName = entity.fullName || entity.name || '';
  return splitFullName(rawName);
}

/**
 * Resolves split address fields from any object containing individual fields
 * or a combined address string.
 */
export function resolveAddressFields(entity?: {
  buildingFlat?: string;
  streetName?: string;
  townCity?: string;
  postcode?: string;
  country?: string;
  address?: string;
}): {
  buildingFlat: string;
  streetName: string;
  townCity: string;
  postcode: string;
  country: string;
} {
  if (!entity) {
    return { buildingFlat: '', streetName: '', townCity: '', postcode: '', country: '' };
  }
  if (entity.buildingFlat || entity.streetName || entity.townCity) {
    return {
      buildingFlat: entity.buildingFlat || '',
      streetName: entity.streetName || '',
      townCity: entity.townCity || '',
      postcode: entity.postcode || '',
      country: entity.country || '',
    };
  }
  const rawAddress = entity.address || '';
  const parsed = splitFullAddress(rawAddress);
  if (entity.postcode && !parsed.postcode) {
    parsed.postcode = entity.postcode;
  }
  if (entity.country && !parsed.country) {
    parsed.country = entity.country;
  }
  return parsed;
}
