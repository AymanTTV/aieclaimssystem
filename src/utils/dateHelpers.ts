import { format, isValid, parseISO, addDays } from 'date-fns';

// Common date formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  INPUT: 'yyyy-MM-dd',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  TIME: 'HH:mm'
} as const;

/**
 * Ensures a valid date is returned from any date-like input
 */
export const ensureValidDate = (value: any): Date => {
  if (!value) return new Date();

  try {
    // Handle Firestore Timestamp
    if (value?.toDate) {
      return value.toDate();
    }

    // Handle Date objects
    if (value instanceof Date && isValid(value)) {
      return value;
    }

    // Handle ISO strings
    if (typeof value === 'string') {
      const parsed = parseISO(value);
      if (isValid(parsed)) {
        return parsed;
      }
    }

    // Handle numeric timestamps
    if (typeof value === 'number') {
      const date = new Date(value);
      if (isValid(date)) {
        return date;
      }
    }

    return new Date();
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date();
  }
};

/**
 * Format a date for display
 */
export const formatDate = (date: Date | string | null | undefined, includeTime = false): string => {
  if (!date) return 'Not set';

  try {
    const validDate = ensureValidDate(date);
    return format(validDate, includeTime ? DATE_FORMATS.DISPLAY_WITH_TIME : DATE_FORMATS.DISPLAY);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

/**
 * Format a date for input fields
 */
export const formatDateForInput = (date: Date | string | undefined | null): string => {
  if (!date) return '';

  try {
    const validDate = ensureValidDate(date);
    return format(validDate, DATE_FORMATS.INPUT);
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};

/**
 * Check if a date is expired
 */
export const isExpired = (date: Date | null | undefined): boolean => {
  if (!date) return false;
  return new Date() > ensureValidDate(date);
};

/**
 * Check if a date is expiring soon (within days)
 */
export const isExpiringSoon = (date: Date | null | undefined, days = 30): boolean => {
  if (!date) return false;
  const validDate = ensureValidDate(date);
  const warningDate = addDays(new Date(), days);
  return validDate <= warningDate;
};

/**
 * Get default expiry date (1 year from now)
 */
export const getDefaultExpiryDate = (): Date => {
  return addDays(new Date(), 365);
};