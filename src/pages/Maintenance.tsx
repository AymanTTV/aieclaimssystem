import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useMaintenanceLogs } from '../hooks/useMaintenanceLogs';
import { useMaintenanceFilters } from '../hooks/useMaintenanceFilters';
import MaintenanceTable from '../components/maintenance/MaintenanceTable';
import MaintenanceFilters from '../components/maintenance/MaintenanceFilters';
import MaintenanceForm from '../components/MaintenanceForm';
import VehicleTestForm from '../components/maintenance/VehicleTestForm';
import MaintenanceDetails from '../components/maintenance/MaintenanceDetails';
import Modal from '../components/ui/Modal';
import { Plus, Download, Upload } from 'lucide-react';
import { exportMaintenanceLogs, processMaintenanceImport } from '../utils/MaintenanceExport';
import { addDoc, collection, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { MaintenanceLog } from '../types';

const Maintenance = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { logs, loading: logsLoading } = useMaintenanceLogs();
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    filteredLogs
  } = useMaintenanceFilters(logs);

  const [showForm, setShowForm] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);
  const [selectedLog, setSelectedLog] = useState<MaintenanceLog | null>(null);
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  const vehiclesMap = vehicles.reduce((acc, vehicle) => {
    acc[vehicle.id] = vehicle;
    return acc;
  }, {} as Record<string, typeof vehicles[0]>);

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
          <button
            onClick={() => exportMaintenanceLogs(logs)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowTestForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Schedule Test
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Schedule Maintenance
          </button>
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

      <MaintenanceTable
        logs={filteredLogs}
        vehicles={vehiclesMap}
        onView={setSelectedLog}
        onEdit={setEditingLog}
        onDelete={(log) => setDeletingLogId(log.id)}
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Schedule Maintenance"
        size="xl"
      >
        <MaintenanceForm
          vehicles={vehicles}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        isOpen={showTestForm}
        onClose={() => setShowTestForm(false)}
        title="Schedule Vehicle Test"
        size="lg"
      >
        <VehicleTestForm
          vehicles={vehicles}
          onClose={() => setShowTestForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Maintenance Details"
        size="lg"
      >
        {selectedLog && (
          <MaintenanceDetails
            log={selectedLog}
            vehicle={vehiclesMap[selectedLog.vehicleId]}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingLog}
        onClose={() => setEditingLog(null)}
        title="Edit Maintenance Log"
        size="xl"
      >
        {editingLog && (
          <MaintenanceForm
            vehicles={vehicles}
            onClose={() => setEditingLog(null)}
            editLog={editingLog}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingLogId}
        onClose={() => setDeletingLogId(null)}
        title="Delete Maintenance Log"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this maintenance log? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingLogId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await deleteDoc(doc(db, 'maintenanceLogs', deletingLogId));
                  toast.success('Maintenance log deleted successfully');
                  setDeletingLogId(null);
                } catch (error) {
                  toast.error('Failed to delete maintenance log');
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Maintenance;