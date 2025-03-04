import React, { useState } from 'react';
import { useVehicles } from '../../hooks/useVehicles';
import { useVehicleFilters } from '../../hooks/useVehicleFilters';
import { useVehicleActions } from '../../hooks/useVehicleActions';
import { handleVehicleExport, handleVehicleImport } from '../../utils/vehicleHelpers';
import { generateAndUploadDocument, generateBulkDocuments } from '../../utils/documentGenerator';
import { VehicleDocument } from '../../components/pdf/documents/VehicleDocument';
import VehicleBulkDocument from '../../components/pdf/documents/VehicleBulkDocument';
import VehicleHeader from './components/VehicleHeader';
import VehicleFilters from './components/VehicleFilters';
import VehicleTable from '../../components/vehicles/VehicleTable';
import VehicleForm from '../../components/vehicles/VehicleForm';
import VehicleDetailsModal from '../../components/vehicles/VehicleDetailsModal';
import VehicleSaleModal from '../../components/vehicles/VehicleSaleModal';
import VehicleUndoSaleModal from '../../components/vehicles/VehicleUndoSaleModal';
import VehicleDeleteModal from '../../components/vehicles/VehicleDeleteModal';
import Modal from '../../components/ui/Modal';
import { useCompanyDetails } from '../../hooks/useCompanyDetails';
import toast from 'react-hot-toast';

const Vehicles = () => {
  const { vehicles, loading } = useVehicles();
  const { companyDetails } = useCompanyDetails();
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

  const handleGenerateDocument = async (vehicle: Vehicle) => {
    try {
      const documentUrl = await generateAndUploadDocument(
        VehicleDocument,
        vehicle,
        'vehicles',
        vehicle.id,
        'vehicles'
      );
      
      toast.success('Document generated successfully');
      return documentUrl;
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    }
  };

  const handleGenerateBulkPDF = async () => {
    try {
      if (!companyDetails) {
        toast.error('Company details not found');
        return;
      }

      const pdfBlob = await generateBulkDocuments(
        VehicleBulkDocument,
        filteredVehicles,
        companyDetails
      );

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fleet_summary_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Fleet summary PDF generated successfully');
    } catch (error) {
      console.error('Error generating fleet summary:', error);
      toast.error('Failed to generate fleet summary');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <VehicleHeader
        onAdd={() => setEditingVehicle({})}
        onExport={() => handleVehicleExport(filteredVehicles)}
        onImport={handleVehicleImport}
        onGeneratePDF={handleGenerateBulkPDF}
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
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={(url) => window.open(url, '_blank')}
      />

      {/* Modals */}
      {editingVehicle && (
        <Modal
          isOpen={!!editingVehicle}
          onClose={() => setEditingVehicle(null)}
          title={editingVehicle.id ? 'Edit Vehicle' : 'Add Vehicle'}
        >
          <VehicleForm
            vehicle={editingVehicle}
            onClose={() => setEditingVehicle(null)}
          />
        </Modal>
      )}

      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
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