import React from 'react';
import { useVehicles } from '../../hooks/useVehicles';
import { useVehicleFilters } from '../../hooks/useVehicleFilters';
import { useVehicleActions } from '../../hooks/useVehicleActions';
import { usePermissions } from '../../hooks/usePermissions';
import VehicleTable from '../../components/vehicles/VehicleTable';
import VehicleFilters from '../../components/vehicles/VehicleFilters';
import VehicleDetailsModal from '../../components/vehicles/VehicleDetailsModal';
import VehicleForm from '../../components/vehicles/VehicleForm';
import VehicleSaleModal from '../../components/vehicles/VehicleSaleModal';
import VehicleUndoSaleModal from '../../components/vehicles/VehicleUndoSaleModal';
import VehicleDeleteModal from '../../components/vehicles/VehicleDeleteModal';
import VehicleHeader from '../../components/vehicles/VehicleHeader';
import { useVehicleStatusUpdates } from '../../hooks/useVehicleStatusUpdates';

const Vehicles = () => {
  const { vehicles, loading } = useVehicles();
  const { can } = usePermissions();
  useVehicleStatusUpdates(); // Add this hook to handle status updates

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
    resetAllModals,
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
      <VehicleHeader
        onAdd={() => setEditingVehicle({})}
        showAddButton={can('vehicles', 'create')}
      />

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

      <VehicleTable
        vehicles={filteredVehicles}
        onView={setSelectedVehicle}
        onEdit={setEditingVehicle}
        onDelete={setDeletingVehicle}
        onMarkAsSold={setSellingVehicle}
      />

      {/* Modals */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

      {editingVehicle && (
        <VehicleForm
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
        />
      )}

      {sellingVehicle && (
        <VehicleSaleModal
          vehicle={sellingVehicle}
          onClose={() => setSellingVehicle(null)}
        />
      )}

      {undoingVehicle && (
        <VehicleUndoSaleModal
          vehicle={undoingVehicle}
          onClose={() => setUndoingVehicle(null)}
        />
      )}

      {deletingVehicle && (
        <VehicleDeleteModal
          vehicle={deletingVehicle}
          onClose={() => setDeletingVehicle(null)}
        />
      )}
    </div>
  );
};

export default Vehicles;