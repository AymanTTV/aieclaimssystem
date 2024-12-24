import { format, isValid, parseISO } from 'date-fns';

export const formatDate = (date: Date | null | undefined): string => {
  if (!date || !isValid(date)) {
    return 'Not set';
  }
  return format(date, 'dd/MM/yyyy');
};

export const formatDateForInput = (date: Date | string | undefined): string => {
  if (!date) {
    return new Date().toISOString().split('T')[0];
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    return new Date().toISOString().split('T')[0];
  }
  return format(dateObj, 'yyyy-MM-dd');
};

export const ensureValidDate = (date: any): Date => {
  if (!date) return new Date();
  
  if (date instanceof Date && isValid(date)) {
    return date;
  }
  
  if (typeof date === 'string') {
    const parsed = parseISO(date);
    if (isValid(parsed)) return parsed;
  }
  
  return new Date();
};