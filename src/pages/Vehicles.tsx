import React from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useVehicleFilters } from '../hooks/useVehicleFilters';
import { usePermissions } from '../hooks/usePermissions';
import VehicleTable from '../components/vehicles/VehicleTable';
import VehicleFilters from '../components/vehicles/VehicleFilters';
import VehicleForm from '../components/vehicles/VehicleForm';

import VehicleSaleModal from '../components/vehicles/VehicleSaleModal';
import VehicleDetailsModal from '../components/vehicles/VehicleDetailsModal';
import VehicleDeleteModal from '../components/vehicles/VehicleDeleteModal';
import Modal from '../components/ui/Modal';
import { Plus, Download, RotateCw, FileText } from 'lucide-react'; // Changed from RefreshCw to RotateCw
import { handleVehicleExport } from '../utils/vehicleHelpers';
import { useVehicleStatusManager, resetAllVehicleStatuses } from '../hooks/useVehicleStatusManager';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, collection, query, where, getDocs, writeBatch, addDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { Vehicle } from '../types';
import toast from 'react-hot-toast';
import { useVehiclesContext } from '../utils/VehicleProvider';
import { useAuth } from '../context/AuthContext';
import { VehicleProvider } from './utils/VehicleProvider';
import { RefreshCw } from 'lucide-react';
import VehicleUndoSaleModal from '../components/vehicles/VehicleUndoSaleModal';

import { syncVehicleStatuses } from '../utils/vehicleStatusManager';

import { generateAndUploadDocument } from '../utils/documentGenerator';
import { VehicleDocument } from '../components/pdf/documents';

import { generateBulkDocuments } from '../utils/documentGenerator';
import { VehicleBulkDocument } from '../components/pdf/documents';


const Vehicles = () => {
  const { vehicles, loading } = useVehicles();
  // const { vehicles, loading } = useVehiclesContext();
  const { can } = usePermissions();
  const { user } = useAuth();
  useVehicleStatusManager();

  // State for modals
  const [showForm, setShowForm] = React.useState(false);
  
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = React.useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = React.useState<Vehicle | null>(null);
  const [sellingVehicle, setSellingVehicle] = React.useState<Vehicle | null>(null);
  const [undoingSaleVehicle, setUndoingSaleVehicle] = React.useState<Vehicle | null>(null); 

  // Filters
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

  const handleExport = () => {
  try {
    handleVehicleExport(vehicles);
    toast.success('Vehicles exported successfully');
  } catch (error) {
    console.error('Error exporting vehicles:', error);
    toast.error('Failed to export vehicles');
  }
};

  const handleGenerateDocument = async (vehicle: Vehicle) => {
  try {
    await generateAndUploadDocument(
      VehicleDocument,
      vehicle,
      'vehicles',
      vehicle.id,
      'vehicles'
    );
    toast.success('Document generated successfully');
  } catch (error) {
    console.error('Error generating document:', error);
    toast.error('Failed to generate document');
  }
};

const handleViewDocument = (url: string) => {
  window.open(url, '_blank');
};

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

  const handleSubmit = async (data: Partial<Vehicle>) => {
    try {
      let imageUrl = data.image ? data.image : editingVehicle?.image || '';

      if (data.image instanceof File) {
        const imageRef = ref(storage, `vehicles/${Date.now()}_${data.image.name}`);
        const snapshot = await uploadBytes(imageRef, data.image);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const vehicleData = {
        ...data,
        image: imageUrl,
        updatedAt: new Date(),
      };

      if (editingVehicle?.id) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), vehicleData);
        toast.success('Vehicle updated successfully');
      } else {
        await addDoc(collection(db, 'vehicles'), {
          ...vehicleData,
          createdAt: new Date(),
        });
        toast.success('Vehicle added successfully');
      }
      
      setEditingVehicle(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(`Failed to ${editingVehicle ? 'update' : 'add'} vehicle`);
    }
  };

  const handleResetStatuses = async () => {
    await resetAllVehicleStatuses(vehicles);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
        <div className="flex space-x-2">
        {user?.role === 'manager' && (
        <button
          onClick={handleGeneratePDF}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FileText className="h-5 w-5 mr-2" />
          Generate PDF
        </button>

        )}

      {user?.role === 'manager' && (
  <button
    onClick={handleExport}
    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
  >
    <Download className="h-5 w-5 mr-2" />
    Export
  </button>
)}

          {can('vehicles', 'create') && (
    <>
      <button
        onClick={syncVehicleStatuses}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        <RefreshCw className="h-5 w-5 mr-2" />
        Sync Statuses
      </button>
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
      >
        <Plus className="h-5 w-5 mr-2" />
        Add Vehicle
      </button>
    </>
  )}
</div>
      </div>

      {/* Rest of the component remains the same */}
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
  onUndoSale={setUndoingSaleVehicle}
  onGenerateDocument={handleGenerateDocument}
  onViewDocument={handleViewDocument}
/>


      {/* Modals */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

      {(showForm || editingVehicle) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowForm(false);
            setEditingVehicle(null);
          }}
          title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
          size="xl"
        >
          <VehicleForm
            vehicle={editingVehicle || undefined}
            onClose={() => {
              setShowForm(false);
              setEditingVehicle(null);
            }}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}

      {sellingVehicle && (
        <VehicleSaleModal
          vehicle={sellingVehicle}
          onClose={() => setSellingVehicle(null)}
        />
      )}

{undoingSaleVehicle && ( // Render the undo sale modal
        <VehicleUndoSaleModal
          vehicle={undoingSaleVehicle}
          onClose={() => setUndoingSaleVehicle(null)}
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
