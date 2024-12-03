import React from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import Card from '../components/Card';
import VehicleStatusChart from '../components/dashboard/VehicleStatusChart';
import MaintenanceTrend from '../components/dashboard/MaintenanceTrend';
import InsuranceExpiryList from '../components/dashboard/InsuranceExpiryList';
import { Car, Wrench, AlertTriangle, Calendar } from 'lucide-react';

const Dashboard = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs: maintenanceLogs, loading: logsLoading } = useMaintenanceLogs();

  if (vehiclesLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    unavailable: vehicles.filter(v => v.status === 'unavailable').length,
  };

  const totalMaintenanceCost = maintenanceLogs.reduce((sum, log) => sum + log.cost, 0);
  const averageMaintenanceCost = totalMaintenanceCost / maintenanceLogs.length || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white">
          <div className="flex items-center">
            <Car className="w-8 h-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Vehicles</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white">
          <div className="flex items-center">
            <Wrench className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">In Maintenance</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.maintenance}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Unavailable</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.unavailable}</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-secondary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Fleet Status Distribution">
          <VehicleStatusChart vehicles={vehicles} />
        </Card>

        <Card title="Maintenance Trend">
          <MaintenanceTrend logs={maintenanceLogs} />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Maintenance Overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total Maintenance Cost</p>
                <p className="text-2xl font-semibold text-primary">
                  ${totalMaintenanceCost.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Average Cost per Maintenance</p>
                <p className="text-2xl font-semibold text-secondary">
                  ${averageMaintenanceCost.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Insurance Expiry Alerts">
          <InsuranceExpiryList vehicles={vehicles} />
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;