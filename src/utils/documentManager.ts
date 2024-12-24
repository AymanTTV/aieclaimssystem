import { Vehicle } from '../types';
import { addDays, isAfter, isBefore } from 'date-fns';
import toast from 'react-hot-toast';

export const checkDocumentExpiry = (vehicle: Vehicle) => {
  const today = new Date();
  const warningDate = addDays(today, 30);

  const expiryChecks = {
    mot: vehicle.motExpiry,
    insurance: vehicle.insuranceExpiry,
    roadTax: vehicle.roadTaxExpiry,
    nsl: vehicle.nslExpiry
  };

  const expiredDocs = Object.entries(expiryChecks)
    .filter(([_, date]) => isAfter(today, date))
    .map(([doc]) => doc);

  const expiringDocs = Object.entries(expiryChecks)
    .filter(([_, date]) => isBefore(date, warningDate) && isAfter(date, today))
    .map(([doc]) => doc);

  if (expiredDocs.length > 0) {
    toast.error(`Expired documents: ${expiredDocs.join(', ')}`);
  }

  if (expiringDocs.length > 0) {
    toast.warning(`Documents expiring soon: ${expiringDocs.join(', ')}`);
  }

  return {
    expired: expiredDocs,
    expiring: expiringDocs,
    isValid: expiredDocs.length === 0
  };
};