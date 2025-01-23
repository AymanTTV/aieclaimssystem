import { format, isValid, parseISO, addDays, isBefore, isAfter, differenceInDays, startOfDay, endOfDay } from 'date-fns';

// Common date formats
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_WITH_TIME: 'dd/MM/yyyy HH:mm',
  INPUT: 'yyyy-MM-dd',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  TIME: 'HH:mm',
  MONTH_YEAR: 'MMM yyyy',
  SHORT_DATE: 'dd MMM',
  FULL_DATE_TIME: 'dd MMM yyyy HH:mm'
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
  if (!date) return 'N/A';

  try {
    const validDate = ensureValidDate(date);
    return format(validDate, includeTime ? DATE_FORMATS.DISPLAY_WITH_TIME : DATE_FORMATS.DISPLAY);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
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
  return isAfter(new Date(), ensureValidDate(date));
};

/**
 * Check if a date is expiring soon (within days)
 */
export const isExpiringSoon = (date: Date | null | undefined, days = 30): boolean => {
  if (!date) return false;
  const validDate = ensureValidDate(date);
  const warningDate = addDays(new Date(), days);
  return isBefore(validDate, warningDate) && !isExpired(validDate);
};

/**
 * Get default expiry date (1 year from now)
 */
export const getDefaultExpiryDate = (): Date => {
  return addDays(new Date(), 365);
};

/**
 * Calculate days between two dates
 */
export const getDaysBetween = (startDate: Date, endDate: Date): number => {
  return differenceInDays(endOfDay(endDate), startOfDay(startDate));
};

/**
 * Format a date range
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  if (format(startDate, 'MM/yyyy') === format(endDate, 'MM/yyyy')) {
    return `${format(startDate, 'dd')} - ${format(endDate, DATE_FORMATS.DISPLAY)}`;
  }
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

/**
 * Parse a date string safely
 */
export const parseDateSafe = (dateString: string): Date | null => {
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Get start of business day
 */
export const getStartOfBusinessDay = (date: Date = new Date()): Date => {
  const businessStart = new Date(date);
  businessStart.setHours(9, 0, 0, 0);
  return businessStart;
};

/**
 * Get end of business day
 */
export const getEndOfBusinessDay = (date: Date = new Date()): Date => {
  const businessEnd = new Date(date);
  businessEnd.setHours(17, 0, 0, 0);
  return businessEnd;
};

/**
 * Check if date is within business hours
 */
export const isWithinBusinessHours = (date: Date = new Date()): boolean => {
  const hours = date.getHours();
  return hours >= 9 && hours < 17;
};

/**
 * Format time only
 */
export const formatTime = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    const validDate = ensureValidDate(date);
    return format(validDate, DATE_FORMATS.TIME);
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'N/A';
  }
};
