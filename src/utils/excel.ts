import * as XLSX from 'xlsx';
import { User, Vehicle, MaintenanceLog, Rental, Accident, Transaction } from '../types';

export const exportToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const importFromExcel = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const formatUserForExport = (user: User) => {
  return {
    Name: user.name,
    Email: user.email,
    Role: user.role,
    'Phone Number': user.phoneNumber || '',
    Address: user.address || '',
    'Created At': user.createdAt.toLocaleDateString(),
  };
};

export const formatVehicleForExport = (vehicle: Vehicle) => {
  return {
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
    'Assigned Driver': vehicle.assignedDriver || '',
  };
};

export const formatMaintenanceLogForExport = (log: MaintenanceLog) => {
  return {
    Date: log.date.toLocaleDateString(),
    Type: log.type,
    Description: log.description,
    Cost: log.cost,
    'Service Provider': log.serviceProvider,
    Status: log.status,
  };
};

export const formatRentalForExport = (rental: Rental) => {
  return {
    'Start Date': rental.startDate.toLocaleDateString(),
    'End Date': rental.endDate.toLocaleDateString(),
    Status: rental.status,
    Cost: rental.cost,
    'Payment Status': rental.paymentStatus,
  };
};

export const formatAccidentForExport = (accident: Accident) => {
  return {
    Date: accident.date.toLocaleDateString(),
    Location: accident.location,
    Description: accident.description,
    Status: accident.status,
    'Claim Amount': accident.claimAmount || '',
    'Claim Status': accident.claimStatus || '',
  };
};

export const formatTransactionForExport = (transaction: Transaction) => {
  return {
    Date: transaction.date.toLocaleDateString(),
    Type: transaction.type,
    Amount: transaction.amount,
    Category: transaction.category,
    Description: transaction.description,
  };
};