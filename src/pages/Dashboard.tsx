import React from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useRentals } from '../hooks/useRentals';
import { useFinances } from '../hooks/useFinances';
import { usePermissions } from '../hooks/usePermissions';
import VehicleMetrics from '../components/dashboard/VehicleMetrics';
import MaintenanceOverview from '../components/dashboard/MaintenanceOverview';
import RentalOverview from '../components/dashboard/RentalOverview';
import FleetStatusChart from '../components/dashboard/FleetStatusChart';
import ComplianceReport from '../components/dashboard/ComplianceReport';
import FinancialSummary from '../components/dashboard/FinancialSummary';
import VehicleReport from '../components/dashboard/VehicleReport';
import UrgentAlerts from '../components/dashboard/UrgentAlerts';

const Dashboard = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs: maintenanceLogs, loading: logsLoading } = useMaintenanceLogs();
  const { rentals, loading: rentalsLoading } = useRentals();
  const { transactions, loading: transactionsLoading } = useFinances();
  const { can } = usePermissions();

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

  if (vehiclesLoading || logsLoading || rentalsLoading || transactionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Vehicle Metrics */}
      {can('vehicles', 'view') && (
        <VehicleMetrics />
      )}

      {/* Financial Summary */}
      {can('finance', 'view') && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Overview</h2>
          <FinancialSummary transactions={transactions} period="month" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Overview */}
        {can('maintenance', 'view') && (
          <MaintenanceOverview logs={maintenanceLogs} />
        )}

        {/* Rental Overview */}
        {can('rentals', 'view') && (
          <RentalOverview rentals={rentals} />
        )}
      </div>

      
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Fleet Status Distribution */}
  {can('vehicles', 'view') && (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Fleet Status Distribution</h2>
      <FleetStatusChart data={fleetStatusData} />
      <VehicleReport vehicles={vehicles} />
    </div>
  )}

  {/* Urgent Alerts */}
  {can('vehicles', 'view') && (
    <UrgentAlerts vehicles={vehicles} maintenanceLogs={maintenanceLogs} />
  )}
</div>

    </div>
  );
};

export default Dashboard;