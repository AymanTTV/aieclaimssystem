import { format, isValid, parseISO } from 'date-fns';

export const formatDateTime = (date: Date | string, time: string): Date => {
  const dateStr = typeof date === 'string' ? date : format(date, 'yyyy-MM-dd');
  const dateTime = parseISO(`${dateStr}T${time}`);
  
  if (!isValid(dateTime)) {
    throw new Error('Invalid date/time combination');
  }
  
  return dateTime;
};

export const validateRentalDates = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): { isValid: boolean; error?: string } => {
  try {
    const start = formatDateTime(startDate, startTime);
    const end = formatDateTime(endDate, endTime);
    
    if (end <= start) {
      return {
        isValid: false,
        error: 'End date/time must be after start date/time'
      };
    }

    if (start < new Date()) {
      return {
        isValid: false,
        error: 'Start date/time cannot be in the past'
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid date/time format'
    };
  }
};