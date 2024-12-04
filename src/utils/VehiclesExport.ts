import { Vehicle } from '../types';
import { exportToExcel } from './excel';

export const exportVehicles = (vehicles: Vehicle[]) => {
  const exportData = vehicles.map(vehicle => ({
    'Registration Number': vehicle.registrationNumber,
    VIN: vehicle.vin,
    Make: vehicle.make,
    Model: vehicle.model,
    Year: vehicle.year,
    Status: vehicle.status,
    Mileage: vehicle.mileage,
    'Insurance Expiry': vehicle.insuranceExpiry.toLocaleDateString(),
    'Last Maintenance': vehicle.lastMaintenance.toLocaleDateString(),
    'Next Maintenance': vehicle.nextMaintenance.toLocaleDateString(),
  }));

  exportToExcel(exportData, 'vehicles');
};

export const processVehiclesImport = (data: any[]) => {
  return data.map(row => ({
    registrationNumber: row['Registration Number'] || '',
    vin: row.VIN || '',
    make: row.Make || '',
    model: row.Model || '',
    year: parseInt(row.Year) || new Date().getFullYear(),
    status: row.Status?.toLowerCase() || 'active',
    mileage: parseInt(row.Mileage) || 0,
    insuranceExpiry: new Date(row['Insurance Expiry']),
    lastMaintenance: new Date(row['Last Maintenance']),
    nextMaintenance: new Date(row['Next Maintenance']),
  }));
};