import React from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import VehicleMetrics from '../components/dashboard/VehicleMetrics';
import MaintenanceTrend from '../components/dashboard/MaintenanceTrend';
import FleetStatusChart from '../components/dashboard/FleetStatusChart';
import ComplianceReport from '../components/dashboard/ComplianceReport';
import VehicleReport from '../components/dashboard/VehicleReport';
import { eachMonthOfInterval, subMonths, format } from 'date-fns';

const Dashboard = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs, loading: logsLoading } = useMaintenanceLogs();

  if (vehiclesLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Prepare maintenance trend data
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date(),
  });

  const maintenanceTrendData = {
    labels: last6Months.map(date => format(date, 'MMM yyyy')),
    datasets: [
      {
        label: 'Maintenance Cost',
        data: last6Months.map(month => {
          return logs
            .filter(log => log.date.getMonth() === month.getMonth())
            .reduce((sum, log) => sum + log.cost, 0);
        }),
        borderColor: 'rgb(220, 38, 38)',
        backgroundColor: 'rgba(220, 38, 38, 0.5)',
      },
      {
        label: 'Number of Maintenance',
        data: last6Months.map(month => {
          return logs.filter(log => log.date.getMonth() === month.getMonth()).length;
        }),
        borderColor: 'rgb(22, 163, 74)',
        backgroundColor: 'rgba(22, 163, 74, 0.5)',
        yAxisID: 'count',
      },
    ],
  };

  // Prepare fleet status distribution data
  const fleetStatusData = {
    labels: ['Active', 'Maintenance', 'Rented', 'Claims', 'Unavailable'],
    datasets: [
      {
        data: [
          vehicles.filter(v => v.status === 'active').length,
          vehicles.filter(v => v.status === 'maintenance').length,
          vehicles.filter(v => v.status === 'rented').length,
          vehicles.filter(v => v.status === 'claim').length,
          vehicles.filter(v => v.status === 'unavailable').length,
        ],
        backgroundColor: [
          'rgba(22, 163, 74, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(220, 38, 38, 0.8)',
        ],
      },
    ],
  };

  return (
    <div className="space-y-6">
      <VehicleMetrics />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MaintenanceTrend data={maintenanceTrendData} />
        <FleetStatusChart data={fleetStatusData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VehicleReport vehicles={vehicles} />
        <ComplianceReport vehicles={vehicles} />
      </div>
    </div>
  );
};

export default Dashboard;