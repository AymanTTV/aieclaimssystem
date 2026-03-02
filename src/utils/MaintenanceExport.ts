import { MaintenanceLog, Vehicle } from '../types';
import { exportToExcel } from './excel';
import { format } from 'date-fns';

export const exportMaintenanceLogs = (logs: MaintenanceLog[], vehicles: Record<string, Vehicle>) => {
  const exportData = logs.map(log => {
    // 1. Try manual details first
    // 2. Fallback to looking up the vehicle in the map via vehicleId
    const registration = log.vehicleDetails?.registrationNumber || 
                         (log.vehicleId ? vehicles[log.vehicleId]?.registrationNumber : 'N/A');

    return {
      'Order Number': log.orderNumber || '-',
      'Invoice Number': log.invoiceNumber || '-',
      'Registration': registration,
      Date: log.date ? format(new Date(log.date), 'dd/MM/yyyy') : '-',
      'Completed Date': log.completedDate ? format(new Date(log.completedDate), 'dd/MM/yyyy') : '-',
      Type: log.type?.replace('-', ' ') || 'maintenance',
      Description: log.description || '',
      Cost: `£${(log.cost || 0).toFixed(2)}`,
      'Paid Amount': `£${(log.paidAmount || 0).toFixed(2)}`,
      'Service Provider': log.serviceProvider || '',
      Status: log.status || '',
      'Payment Status': log.paymentStatus || ''
    };
  });

  exportToExcel(exportData, `maintenance_report_${format(new Date(), 'yyyy-MM-dd')}`);
};

export const processMaintenanceImport = (data: any[]) => {
  return data.map(row => ({
    orderNumber: row['Order Number'] !== '-' ? row['Order Number'] : '',
    invoiceNumber: row['Invoice Number'] !== '-' ? row['Invoice Number'] : '',
    date: new Date(row.Date),
    type: row.Type?.toLowerCase().replace(' ', '-') || 'maintenance',
    description: row.Description || '',
    cost: parseFloat(row.Cost?.replace('£', '')) || 0,
    serviceProvider: row['Service Provider'] || '',
    status: row.Status?.toLowerCase() || 'scheduled',
  }));
};