import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useVehicleFilters } from '../hooks/useVehicleFilters';
import { Vehicle } from '../types';
import VehicleHeader from '../components/vehicles/VehicleHeader';
import VehicleFilters from '../components/vehicles/VehicleFilters';
import VehicleTable from '../components/vehicles/VehicleTable';
import VehicleForm from '../components/vehicles/VehicleForm';
import VehicleDetailsModal from '../components/vehicles/VehicleDetailsModal';
import VehicleEditModal from '../components/vehicles/VehicleEditModal';
import VehicleSaleModal from '../components/vehicles/VehicleSaleModal';
import VehicleUndoSaleModal from '../components/vehicles/VehicleUndoSaleModal';
import VehicleDeleteModal from '../components/vehicles/VehicleDeleteModal';
import Modal from '../components/ui/Modal';
import { handleVehicleExport, handleVehicleImport } from '../utils/vehicleHelpers';
import { generateBulkDocuments } from '../utils/documentGenerator';
import { VehicleBulkDocument } from '../components/pdf/documents';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

const Vehicles = () => {
  const { vehicles, loading } = useVehicles();
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

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [sellingVehicle, setSellingVehicle] = useState<Vehicle | null>(null);
  const [undoingVehicle, setUndoingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState<Vehicle | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleGeneratePDF = async () => {
    try {
      // Get company details
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (!companyDoc.exists()) {
        throw new Error('Company details not found');
      }
      const companyDetails = companyDoc.data();

      // Generate PDF with all filtered vehicles
      const pdfBlob = await generateBulkDocuments(
        VehicleBulkDocument,
        filteredVehicles,
        companyDetails
      );

      // Create URL and open in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');

      toast.success('Vehicle summary PDF generated successfully');
    } catch (error) {
      console.error('Error generating vehicle PDF:', error);
      toast.error('Failed to generate vehicle PDF');
    }
  };

 if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VehicleHeader
        onAdd={() => setShowAddModal(true)}
        onExport={() => handleVehicleExport(vehicles)}
        onImport={handleVehicleImport}
        onGeneratePDF={handleGeneratePDF}
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
        onUndoSale={setUndoingVehicle}
        onGenerateDocument={handleGeneratePDF}
        onViewDocument={(url) => window.open(url, '_blank')}
      />

      {/* Modals */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Vehicle"
      >
        <VehicleForm onClose={() => setShowAddModal(false)} />
      </Modal>

      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

      {editingVehicle && (
        <VehicleEditModal
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