import { format, isValid, parse, parseISO } from 'date-fns';

// Format used for displaying dates
export const DISPLAY_DATE_FORMAT = 'yyyy/MM/dd';

// Format used for input fields
export const INPUT_DATE_FORMAT = 'yyyy-MM-dd';

export const formatDisplayDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'Not set';
  
  try {
    // Handle string dates
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, DISPLAY_DATE_FORMAT) : 'Invalid date';
  } catch (error) {
    console.error('Error formatting display date:', error);
    return 'Invalid date';
  }
};

export const formatInputDate = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return isValid(dateObj) ? format(dateObj, INPUT_DATE_FORMAT) : '';
  } catch (error) {
    console.error('Error formatting input date:', error);
    return '';
  }
};

export const parseFormDate = (dateString: string): Date | null => {
  try {
    const parsedDate = parse(dateString, INPUT_DATE_FORMAT, new Date());
    return isValid(parsedDate) ? parsedDate : null;
  } catch (error) {
    console.error('Error parsing form date:', error);
    return null;
  }
};