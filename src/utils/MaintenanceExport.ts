import { MaintenanceLog } from '../types';
import { exportToExcel } from './excel';
import { format } from 'date-fns';

export const exportMaintenanceLogs = (logs: MaintenanceLog[]) => {
  const exportData = logs.map(log => ({
    Date: format(log.date, 'dd/MM/yyyy'),
    Type: log.type,
    Description: log.description,
    Cost: `£${log.cost.toFixed(2)}`,
    'Service Provider': log.serviceProvider,
    Status: log.status,
  }));

  exportToExcel(exportData, 'maintenance_logs');
};

export const processMaintenanceImport = (data: any[]) => {
  return data.map(row => ({
    date: new Date(row.Date),
    type: row.Type?.toLowerCase() || 'routine',
    description: row.Description || '',
    cost: parseFloat(row.Cost?.replace('£', '')) || 0,
    serviceProvider: row['Service Provider'] || '',
    status: row.Status?.toLowerCase() || 'scheduled',
  }));
};