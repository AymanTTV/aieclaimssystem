import { format, isValid, parseISO } from 'date-fns';

export const formatDate = (date: Date | null | undefined): string => {
  if (!date || !isValid(date)) {
    return 'Not set';
  }
  return format(date, 'MMM dd, yyyy');
};

export const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) {
    return new Date().toISOString().split('T')[0];
  }

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(dateObj)) {
      return new Date().toISOString().split('T')[0];
    }
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

export const ensureValidDate = (date: Date | string | undefined): Date => {
  if (!date) return new Date();
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    return isValid(dateObj) ? dateObj : new Date();
  } catch {
    return new Date();
  }
};