import React from 'react';
import { useVehicles } from '../../hooks/useVehicles';
import { useVehicleFilters } from '../../hooks/useVehicleFilters';
import { useVehicleActions } from '../../hooks/useVehicleActions';
import { usePermissions } from '../../hooks/usePermissions';
import VehicleTable from '../../components/vehicles/VehicleTable';
import VehicleFilters from './components/VehicleFilters';
import VehicleDetailsModal from './components/VehicleDetailsModal';
import VehicleFormModal from './components/VehicleFormModal';
import VehicleSaleModal from './components/VehicleSaleModal';
import VehicleUndoSaleModal from './components/VehicleUndoSaleModal';
import VehicleDeleteModal from './components/VehicleDeleteModal';
import VehicleHeader from './components/VehicleHeader';

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
        onDelete={vehicle => setDeletingVehicle(vehicle)}
        onMarkAsSold={setSellingVehicle}
        onUndoSold={setUndoingVehicle}
      />

      {/* Modals */}
      <VehicleDetailsModal
        isOpen={!!selectedVehicle}
        vehicle={selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
      />

      <VehicleFormModal
        isOpen={!!editingVehicle}
        vehicle={editingVehicle}
        onClose={() => setEditingVehicle(null)}
      />

      <VehicleSaleModal
        vehicle={sellingVehicle}
        onClose={() => setSellingVehicle(null)}
      />

      <VehicleUndoSaleModal
        vehicle={undoingVehicle}
        onClose={() => setUndoingVehicle(null)}
      />

      <VehicleDeleteModal
        vehicle={deletingVehicle}
        onClose={() => setDeletingVehicle(null)}
      />
    </div>
  );
};

export default Vehicles;