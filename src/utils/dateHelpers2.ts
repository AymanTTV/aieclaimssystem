import { format, isValid, parseISO } from 'date-fns';

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
