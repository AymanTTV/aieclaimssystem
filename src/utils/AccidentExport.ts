import { Accident } from '../types';
import { exportToExcel } from './excel';

export const exportAccidents = (accidents: Accident[]) => {
  const exportData = accidents.map(accident => ({
    Date: accident.date.toLocaleDateString(),
    Description: accident.description,
    'Driver Name': accident.driverName || 'Unknown',
    Cost: `$${accident.cost.toFixed(2)}`,
    Status: accident.status,
    Location: accident.location,
  }));

  exportToExcel(exportData, 'accident_logs');
};

export const processAccidentsImport = (data: any[]) => {
  return data.map(row => ({
    date: new Date(row.Date),
    description: row.Description || '',
    driverName: row['Driver Name'] || '',
    cost: parseFloat(row.Cost?.replace('$', '')) || 0,
    status: row.Status?.toLowerCase() || 'reported',
    location: row.Location || '',
  }));
};
