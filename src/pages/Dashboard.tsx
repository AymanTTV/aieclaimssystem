import React from 'react';
import { useVehicles } from '../hooks/useVehicles';
import Card from '../components/Card';
import VehicleCard from '../components/VehicleCard';
import StatusBadge from '../components/StatusBadge';
import { Car, Wrench, AlertTriangle, Calendar } from 'lucide-react';

const Dashboard = () => {
  const { vehicles, loading, error } = useVehicles();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        Error loading vehicles: {error}
      </div>
    );
  }

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    unavailable: vehicles.filter(v => v.status === 'unavailable').length,
  };

  const upcomingMaintenance = vehicles
    .filter(v => v.nextMaintenance > new Date())
    .sort((a, b) => a.nextMaintenance.getTime() - b.nextMaintenance.getTime())
    .slice(0, 3);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Fleet Overview">
            <div className="grid gap-4">
              {vehicles.map(vehicle => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Upcoming Maintenance">
            <div className="space-y-4">
              {upcomingMaintenance.map(vehicle => (
                <div key={vehicle.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-gray-500">{vehicle.registrationNumber}</p>
                  </div>
                  <StatusBadge status={vehicle.status} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;