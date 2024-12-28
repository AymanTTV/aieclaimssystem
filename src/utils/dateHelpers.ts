import { format, isValid, parseISO } from 'date-fns';

/**
 * Formats a date for HTML input elements
 */
export const formatDateForInput = (date: Date | string | undefined | null): string => {
  if (!date) return new Date().toISOString().split('T')[0];

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * Ensures a date value is a valid Date object
 */
export const ensureValidDate = (date: any): Date => {
  if (!date) return new Date();
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? dateObj : new Date();
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date();
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
 * Validates a date string
 */
export const isValidDateString = (dateString: string): boolean => {
  try {
    const date = parseISO(dateString);
    return isValid(date);
  } catch {
    return false;
  }
};