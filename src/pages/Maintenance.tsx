import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import Card from '../components/Card';
import MaintenanceLogCard from '../components/MaintenanceLogCard';
import MaintenanceForm from '../components/MaintenanceForm';
import MaintenanceHeader from '../components/maintenance/MaintenanceHeader';
import { exportMaintenanceLogs, processMaintenanceImport } from '../utils/MaintenanceExport';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

const Maintenance = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs, loading: logsLoading } = useMaintenanceLogs();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  if (vehiclesLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const vehicleMap = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.id] = vehicle;
    return acc;
  }, {} as Record<string, typeof vehicles[0]>);

  const handleSearch = (query: string) => {
    setSearchTerm(query.toLowerCase());
  };

  const handleExport = () => {
    exportMaintenanceLogs(logs);
    toast.success('Maintenance logs exported successfully');
  };

  const handleImport = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result;
        const rows = text?.toString().split('\n').map(row => row.split(','));
        if (rows) {
          const importedData = processMaintenanceImport(rows);
          
          for (const log of importedData) {
            await addDoc(collection(db, 'maintenanceLogs'), {
              ...log,
              vehicleId: vehicles[0].id,
            });
          }
          
          toast.success(`${importedData.length} maintenance logs imported successfully`);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing maintenance logs:', error);
      toast.error('Failed to import maintenance logs');
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchTerm) ||
      log.serviceProvider.toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesVehicle = !selectedVehicle || log.vehicleId === selectedVehicle;
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  return (
    <div className="space-y-6">
      <MaintenanceHeader
        onSearch={handleSearch}
        onImport={handleImport}
        onExport={handleExport}
        onAdd={() => setShowForm(true)}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card title="Filter by Vehicle">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedVehicle(null)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  !selectedVehicle
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                All Vehicles
              </button>
              {vehicles.map(vehicle => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                    selectedVehicle === vehicle.id
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {vehicle.make} {vehicle.model} - {vehicle.registrationNumber}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <div className="space-y-4">
            {filteredLogs.map(log => (
              <MaintenanceLogCard
                key={log.id}
                log={log}
                vehicle={vehicleMap[log.vehicleId]}
              />
            ))}
            {filteredLogs.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No maintenance logs found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Schedule Maintenance
            </h2>
            <MaintenanceForm
              vehicles={vehicles}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;