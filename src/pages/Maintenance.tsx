import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useMaintenanceFilters } from '../hooks/useMaintenanceFilters';
import { usePermissions } from '../hooks/usePermissions';
import MaintenanceTable from '../components/maintenance/MaintenanceTable';
import MaintenanceFilters from '../components/maintenance/MaintenanceFilters';
import MaintenanceForm from '../components/maintenance/MaintenanceForm';

import MaintenanceDetails from '../components/maintenance/MaintenanceDetails';
import MaintenanceDeleteModal from '../components/maintenance/MaintenanceDeleteModal';
import Modal from '../components/ui/Modal';
import { Plus, Download } from 'lucide-react';
import { exportMaintenanceLogs } from '../utils/maintenanceExport';
import { MaintenanceLog } from '../types';
import toast from 'react-hot-toast';
import { useVehiclesContext } from '../utils/VehicleProvider';
import { useAuth } from '../context/AuthContext';


const Maintenance = () => {
  // const { vehicles, loading } = useVehiclesContext();
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs, loading: logsLoading } = useMaintenanceLogs();
  const { can } = usePermissions();
  const { user } = useAuth();


  // Create vehiclesMap for efficient lookups
  const vehiclesMap = React.useMemo(() => {
    return vehicles.reduce((acc, vehicle) => {
      acc[vehicle.id] = vehicle;
      return acc;
    }, {} as Record<string, Vehicle>);
  }, [vehicles]);

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    filteredLogs,
  } = useMaintenanceFilters(logs, vehiclesMap);

  const [showForm, setShowForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<MaintenanceLog | null>(null);

  const handleDelete = async (log: MaintenanceLog) => {
    if (!can('maintenance', 'delete')) {
      toast.error('You do not have permission to delete maintenance logs');
      return;
    }
    setDeletingLog(log);
  };

  const handleExport = () => {
    try {
      exportMaintenanceLogs(logs);
      toast.success('Maintenance logs exported successfully');
    } catch (error) {
      console.error('Error exporting maintenance logs:', error);
      toast.error('Failed to export maintenance logs');
    }
  };

  if (vehiclesLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
        <div className="flex space-x-2">
          
              {user?.role === 'manager' && (
  <button
    onClick={handleExport}
    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
  >
    <Download className="h-5 w-5 mr-2" />
    Export
  </button>
)}

          {can('maintenance', 'create') && (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Schedule Maintenance
              </button>
            </>
          )}
        </div>
      </div>

      <MaintenanceFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        vehicleFilter={vehicleFilter}
        onVehicleFilterChange={setVehicleFilter}
        vehicles={vehicles}
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <MaintenanceTable
          logs={filteredLogs}
          vehicles={vehiclesMap}
          onView={setSelectedLog}
          onEdit={setEditingLog}
          onDelete={handleDelete}
        />
      </div>
{/* Modals */}
      <Modal
        isOpen={showForm || !!editingLog}
        onClose={() => {
          setShowForm(false);
          setEditingLog(null);
        }}
        title={editingLog ? 'Edit Maintenance' : 'Schedule Maintenance'}
        size="xl"
      >
        <MaintenanceForm
          vehicles={vehicles}
          onClose={() => {
            setShowForm(false);
            setEditingLog(null);
          }}
          editLog={editingLog || undefined}
        />
      </Modal>


      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Maintenance Details"
        size="lg"
      >
        {selectedLog && vehiclesMap[selectedLog.vehicleId] && (
          <MaintenanceDetails
            log={selectedLog}
            vehicle={vehiclesMap[selectedLog.vehicleId]}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingLog}
        onClose={() => setDeletingLog(null)}
        title="Delete Maintenance Log"
      >
        {deletingLog && (
          <MaintenanceDeleteModal
            logId={deletingLog.id}
            onClose={() => setDeletingLog(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Maintenance;