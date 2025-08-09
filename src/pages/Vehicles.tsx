// src/pages/Vehicles.tsx

import React from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useVehicleFilters } from '../hooks/useVehicleFilters';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../context/AuthContext';
import { useVehicleStatusManager, resetAllVehicleStatuses } from '../hooks/useVehicleStatusManager';
import VehicleFilters from '../components/vehicles/VehicleFilters';
import VehicleTable from '../components/vehicles/VehicleTable';
import SetServiceMileageModal from '../components/vehicles/SetServiceMileageModal';
import VehicleForm from '../components/vehicles/VehicleForm';
import VehicleSaleModal from '../components/vehicles/VehicleSaleModal';
import VehicleUndoSaleModal from '../components/vehicles/VehicleUndoSaleModal';
import VehicleDetailsModal from '../components/vehicles/VehicleDetailsModal';
import VehicleDeleteModal from '../components/vehicles/VehicleDeleteModal';
import Modal from '../components/ui/Modal';
import {
  Plus,
  Download,
  RefreshCw,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, collection, addDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { Vehicle } from '../types';
import { handleVehicleExport } from '../utils/vehicleHelpers';
import { syncVehicleStatuses } from '../utils/vehicleStatusManager';
import { generateAndUploadDocument, generateBulkDocuments } from '../utils/documentGenerator';
import { VehicleDocument, VehicleBulkDocument } from '../components/pdf/documents';

const Vehicles: React.FC = () => {
  const { vehicles, loading } = useVehicles();
  const { can } = usePermissions();
  const { user } = useAuth();
  useVehicleStatusManager();

  // Threshold (miles) for “due soon”
  const SERVICE_THRESHOLD = 1_000;

  // Filters state & logic
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

  // Modal state
  const [showForm, setShowForm] = React.useState(false);
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = React.useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = React.useState<Vehicle | null>(null);
  const [sellingVehicle, setSellingVehicle] = React.useState<Vehicle | null>(null);
  const [undoingSaleVehicle, setUndoingSaleVehicle] = React.useState<Vehicle | null>(null);

  // Compute “overdue” and “due soon” arrays
  const overdue = filteredVehicles.filter(v => v.nextServiceMileage <= v.mileage);
  const dueSoonArr = filteredVehicles.filter(v =>
    v.nextServiceMileage > v.mileage &&
    v.nextServiceMileage - v.mileage <= SERVICE_THRESHOLD
  );

  // “Due soon” toggle
  const [showDueSoon, setShowDueSoon] = React.useState(false);
  const displayedVehicles = showDueSoon ? dueSoonArr : filteredVehicles;
  const [serviceVehicle, setServiceVehicle] = React.useState<Vehicle | null>(null);

  // Export CSV
  const handleExport = () => {
    try {
      handleVehicleExport(vehicles);
      toast.success('Vehicles exported successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export vehicles');
    }
  };

  // Generate single PDF document
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
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate document');
    }
  };

  // View existing document URL
  const handleViewDocument = (url: string) => {
    window.open(url, '_blank');
  };

  // Generate bulk PDF for all filtered
  const handleGeneratePDF = async () => {
    try {
      const companyDoc = await getDoc(doc(db, 'companySettings', 'details'));
      if (!companyDoc.exists()) throw new Error();
      const companyDetails = companyDoc.data();
      const pdfBlob = await generateBulkDocuments(
        VehicleBulkDocument,
        filteredVehicles,
        companyDetails
      );
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      toast.success('Vehicle summary PDF generated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate vehicle PDF');
    }
  };

  // Add/Edit form submission
  const handleSubmit = async (data: Partial<Vehicle>) => {
    try {
      let imageUrl = data.image as string || editingVehicle?.image || '';
      if (data.image instanceof File) {
        const imageRef = ref(storage, `vehicles/${Date.now()}_${data.image.name}`);
        const snap = await uploadBytes(imageRef, data.image);
        imageUrl = await getDownloadURL(snap.ref);
      }

      const payload: Partial<Vehicle> = {
        ...data,
        image: imageUrl,
        updatedAt: new Date(),
        nextServiceMileage: data.nextServiceMileage, // ensure this is present
      };

      if (editingVehicle?.id) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), payload);
        toast.success('Vehicle updated successfully');
      } else {
        await addDoc(collection(db, 'vehicles'), {
          ...payload,
          createdAt: new Date(),
        });
        toast.success('Vehicle added successfully');
      }

      setEditingVehicle(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save vehicle');
    }
  };

  // Reset statuses utility
  const handleResetStatuses = async () => {
    await resetAllVehicleStatuses(vehicles);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border-l-4 border-green-400 p-4 flex items-center">
          <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-green-700">All Vehicles</p>
            <p className="mt-1 text-xl font-semibold">{filteredVehicles.length}</p>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 flex items-center">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-yellow-700">
              Due within {SERVICE_THRESHOLD.toLocaleString()} mi
            </p>
            <p className="mt-1 text-xl font-semibold">{dueSoonArr.length}</p>
          </div>
        </div>

        <div className="bg-red-50 border-l-4 border-red-400 p-4 flex items-center">
          <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
          <div>
            <p className="text-sm font-medium text-red-700">Overdue</p>
            <p className="mt-1 text-xl font-semibold">{overdue.length}</p>
          </div>
        </div>
      </div>

      {/* Header & Actions */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
        <div className="flex space-x-2">
          {user?.role === 'manager' && (
            <>
              <button
                onClick={handleGeneratePDF}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-5 w-5 mr-2" />
                Generate PDF
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-5 w-5 mr-2" />
                Export
              </button>
            </>
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
        showDueSoon={showDueSoon}
        onShowDueSoonChange={setShowDueSoon}
      />

      {/* Table */}
      <VehicleTable
        vehicles={displayedVehicles}
        onView={setSelectedVehicle}
        onEdit={setEditingVehicle}
        onDelete={setDeletingVehicle}
        onMarkAsSold={setSellingVehicle}
        onUndoSale={setUndoingSaleVehicle}
        onGenerateDocument={handleGenerateDocument}
        onViewDocument={handleViewDocument}
        onSetServiceMileage={setServiceVehicle}
      />

      {serviceVehicle && (
        <SetServiceMileageModal
          vehicle={serviceVehicle}
          onClose={() => setServiceVehicle(null)}
        />
      )}

      {/* Modals */}
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}

      {(showForm || editingVehicle) && (
        <Modal
          isOpen
          onClose={() => {
            setShowForm(false);
            setEditingVehicle(null);
          }}
          title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
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

      {undoingSaleVehicle && (
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
