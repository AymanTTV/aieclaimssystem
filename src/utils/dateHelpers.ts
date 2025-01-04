import { format, isValid, parseISO, addYears } from 'date-fns';

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

export const formatDate = (date: Date | null | undefined): string => {
  if (!date || !isValid(date)) {
    return 'Not set';
  }
  return format(date, 'dd/MM/yyyy');
};

export const formatDateForInput = (date: Date | string | undefined | null): string => {
  if (!date) return '';

  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else {
      return '';
    }

    if (!isValid(dateObj)) {
      return '';
    }

    return format(dateObj, 'yyyy-MM-dd');
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const getDefaultNextServiceDate = (currentDate: Date = new Date()): Date => {
  return addYears(currentDate, 1);
};