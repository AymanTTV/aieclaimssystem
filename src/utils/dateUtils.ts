import { isValid, parseISO } from 'date-fns';

export const toDate = (date: any): Date | null => {
  if (!date) return null;
  
  // If it's already a Date object
  if (date instanceof Date) return date;
  
  // If it's a Firestore Timestamp
  if (date?.toDate) return date.toDate();
  
  // If it's an ISO string
  try {
    const parsed = parseISO(date);
    if (isValid(parsed)) return parsed;
  } catch (e) {
    console.error('Error parsing date:', e);
  }
  
  return null;
};

export const getEarliestDate = (dates: (Date | null)[]): Date | null => {
  const validDates = dates.filter((d): d is Date => d instanceof Date);
  return validDates.length > 0 ? new Date(Math.min(...validDates.map(d => d.getTime()))) : null;
};