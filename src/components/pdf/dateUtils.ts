import { format } from 'date-fns';

export const formatPDFDate = (date: any): string => {
  try {
    // Handle Firestore Timestamp
    if (date?.toDate) {
      date = date.toDate();
    }
    
    // Handle string dates
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    // Ensure we have a valid date
    if (date instanceof Date && !isNaN(date.getTime())) {
      return format(date, 'dd/MM/yyyy HH:mm');
    }
    
    return 'N/A';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};
