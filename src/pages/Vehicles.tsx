import React from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useVehicleFilters } from '../hooks/useVehicleFilters';
import { useVehicleActions } from '../hooks/useVehicleActions';
import { usePermissions } from '../hooks/usePermissions';
import VehicleTable from '../components/vehicles/VehicleTable';
import VehicleFilters from '../components/vehicles/VehicleFilters';
import VehicleDetailsModal from '../components/vehicles/VehicleDetailsModal';
import VehicleForm from '../components/vehicles/VehicleForm';
import VehicleSaleModal from '../components/vehicles/VehicleSaleModal';
import VehicleUndoSaleModal from '../components/vehicles/VehicleUndoSaleModal';
import VehicleDeleteModal from '../components/vehicles/VehicleDeleteModal';
import Modal from '../components/ui/Modal';
import { Plus, Download } from 'lucide-react';
import { exportVehicles } from '../utils/VehiclesExport';
import toast from 'react-hot-toast';

const Vehicles = () => {
  const { vehicles, loading } = useVehicles();
  const { can } = usePermissions();
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    makeFilter,
    setMakeFilter,
    showSold,
    setShowSold,
    filteredVehicles,
    uniqueMakes,
  } = useVehicleFilters(vehicles);

  const {
    selectedVehicle,
    setSelectedVehicle,
    editingVehicle,
    setEditingVehicle,
    sellingVehicle,
    setSellingVehicle,
    undoingVehicle,
    setUndoingVehicle,
    deletingVehicle,
    setDeletingVehicle,
  } = useVehicleActions();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              exportVehicles(vehicles);
              toast.success('Vehicles exported successfully');
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
          {can('vehicles', 'create') && (
            <button
              onClick={() => setEditingVehicle({})}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <VehicleFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        makeFilter={makeFilter}
        onMakeFilterChange={setMakeFilter}
        makes={uniqueMakes}
        showSold={showSold}
        onShowSoldChange={setShowSold}
      />

      {/* Table */}
      <VehicleTable
        vehicles={filteredVehicles}
        onView={setSelectedVehicle}
        onEdit={setEditingVehicle}
        onDelete={setDeletingVehicle}
      />

      {/* Modals */}
      <Modal
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        title="Vehicle Details"
        size="lg"
      >
        {selectedVehicle && (
          <VehicleDetailsModal
            vehicle={selectedVehicle}
            onClose={() => setSelectedVehicle(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingVehicle}
        onClose={() => setEditingVehicle(null)}
        title={editingVehicle?.id ? "Edit Vehicle" : "Add Vehicle"}
        size="xl"
      >
        <VehicleForm
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
        />
      </Modal>

      <Modal
        isOpen={!!sellingVehicle}
        onClose={() => setSellingVehicle(null)}
        title="Mark Vehicle as Sold"
      >
        {sellingVehicle && (
          <VehicleSaleModal
            vehicle={sellingVehicle}
            onClose={() => setSellingVehicle(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!undoingVehicle}
        onClose={() => setUndoingVehicle(null)}
        title="Undo Vehicle Sale"
      >
        {undoingVehicle && (
          <VehicleUndoSaleModal
            vehicle={undoingVehicle}
            onClose={() => setUndoingVehicle(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingVehicle}
        onClose={() => setDeletingVehicle(null)}
        title="Delete Vehicle"
      >
        {deletingVehicle && (
          <VehicleDeleteModal
            vehicle={deletingVehicle}
            onClose={() => setDeletingVehicle(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Vehicles;