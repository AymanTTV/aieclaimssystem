import { format, isValid, parseISO } from 'date-fns';

/**
 * Ensures a date value is a valid Date object
 */
export const ensureValidDate = (value: any): Date | null => {
  if (!value) return null;

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

    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Formats a date for display
 */
export const formatDate = (date: Date | null | undefined): string => {
  if (!date || !isValid(date)) {
    return 'Not set';
  }
  return format(date, 'dd/MM/yyyy');
};

/**
 * Formats a date for HTML input elements
 */
export const formatDateForInput = (date: Date | string | undefined | null): string => {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, 'yyyy-MM-dd') : '';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};