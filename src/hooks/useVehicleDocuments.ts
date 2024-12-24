import { useState, useEffect } from 'react';
import { Vehicle } from '../types';
import { addDays } from 'date-fns';

interface DocumentStatus {
  mot: boolean;
  insurance: boolean;
  roadTax: boolean;
  nsl: boolean;
}

export const useVehicleDocuments = (vehicle: Vehicle) => {
  const [expiring, setExpiring] = useState<DocumentStatus>({
    mot: false,
    insurance: false,
    roadTax: false,
    nsl: false
  });

  useEffect(() => {
    const today = new Date();
    const warningDate = addDays(today, 30);

    setExpiring({
      mot: vehicle.motExpiry <= warningDate,
      insurance: vehicle.insuranceExpiry <= warningDate,
      roadTax: vehicle.roadTaxExpiry <= warningDate,
      nsl: vehicle.nslExpiry <= warningDate
    });
  }, [vehicle]);

  const hasExpiringDocuments = Object.values(expiring).some(Boolean);

  return { expiring, hasExpiringDocuments };
};