import { Rental } from '../types';
import { exportToExcel } from './excel';

export const exportRentals = (rentals: Rental[]) => {
  const exportData = rentals.map((rental) => ({
    Date: rental.date.toLocaleDateString(),
    'Vehicle Name': `${rental.vehicle?.make} ${rental.vehicle?.model}`,
    'Registration Number': rental.vehicle?.registrationNumber,
    Renter: rental.renter?.name || 'Unknown',
    'Rental Period': `${rental.startDate} - ${rental.endDate}`,
    Cost: `$${rental.cost.toFixed(2)}`,
    Status: rental.status,
  }));

  exportToExcel(exportData, 'rental_logs');
};

export const processRentalsImport = (data: any[]) => {
  return data.map((row) => ({
    date: new Date(row.Date),
    vehicle: {
      make: row['Vehicle Name'].split(' ')[0],
      model: row['Vehicle Name'].split(' ')[1],
      registrationNumber: row['Registration Number'],
    },
    renter: { name: row.Renter },
    startDate: row['Rental Period'].split(' - ')[0],
    endDate: row['Rental Period'].split(' - ')[1],
    cost: parseFloat(row.Cost?.replace('$', '')) || 0,
    status: row.Status?.toLowerCase() || 'pending',
  }));
};
