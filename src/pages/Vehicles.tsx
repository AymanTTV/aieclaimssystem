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
import { doc, collection, addDoc, updateDoc, getDoc, getDocs } from 'firebase/firestore'; // Added getDocs
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

  const SERVICE_THRESHOLD = 1_000;

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
    expiryFilter,
    setExpiryFilter,
    // NEW Props
    accountFilter,
    setAccountFilter,
  } = useVehicleFilters(vehicles);

  // NEW: State for accounts list
  const [accounts, setAccounts] = React.useState<{ id: string; name: string }[]>([]);

  // NEW: Fetch accounts on mount
  React.useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'accounts'));
        const accs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setAccounts(accs.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error("Error fetching accounts:", error);
      }
    };
    fetchAccounts();
  }, []);

  const [showForm, setShowForm] = React.useState(false);
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = React.useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = React.useState<Vehicle | null>(null);
  const [sellingVehicle, setSellingVehicle] = React.useState<Vehicle | null>(null);
  const [undoingSaleVehicle, setUndoingSaleVehicle] = React.useState<Vehicle | null>(null);
  const [serviceVehicle, setServiceVehicle] = React.useState<Vehicle | null>(null);

  const overdue = filteredVehicles.filter(v => v.nextServiceMileage <= v.mileage);
  const dueSoonArr = filteredVehicles.filter(
    v => v.nextServiceMileage > v.mileage && v.nextServiceMileage - v.mileage <= SERVICE_THRESHOLD
  );

  const [showDueSoon, setShowDueSoon] = React.useState(false);
  const displayedVehicles = showDueSoon ? dueSoonArr : filteredVehicles;

  const handleExport = () => {
    try {
      handleVehicleExport(vehicles);
      toast.success('Vehicles exported successfully');
    } catch (err) {
      console.error(err);
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
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate document');
    }
  };

  const handleViewDocument = (url: string) => {
    window.open(url, '_blank');
  };

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

  const handleSubmit = async (data: Partial<Vehicle>) => {
    try {
      let imageUrl = (data.image as string) || editingVehicle?.image || '';
      if (data.image instanceof File) {
        const imageRef = ref(storage, `vehicles/${Date.now()}_${data.image.name}`);
        const snap = await uploadBytes(imageRef, data.image);
        imageUrl = await getDownloadURL(snap.ref);
      }

      const payload: Partial<Vehicle> = {
        ...data,
        image: imageUrl,
        updatedAt: new Date(),
        nextServiceMileage: data.nextServiceMileage,
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
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            AIE Vehicles
          </h1>

          <div className="w-full grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:w-auto">
            
            {can('vehicles', 'export') && (
            <button
              onClick={handleGeneratePDF}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
            >
              <FileText className="h-5 w-5 mr-2" />
              Generate PDF
            </button>
            )}
            {can('vehicles', 'export') && (
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
            >
              <Download className="h-5 w-5 mr-2" />
              Export
            </button>
            )}
          
            {can('vehicles', 'create') && (
              <>
                <button
                  onClick={syncVehicleStatuses}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Sync Statuses
                </button>

                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 w-full sm:w-auto"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Vehicle
                </button>
              </>
            )}
          </div>
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
        expiryFilter={expiryFilter}
        onExpiryFilterChange={setExpiryFilter}
        // NEW Props
        accountFilter={accountFilter}
        onAccountFilterChange={setAccountFilter}
        accounts={accounts}
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
        <SetServiceMileageModal vehicle={serviceVehicle} onClose={() => setServiceVehicle(null)} />
      )}

      {/* Modals */}
      {selectedVehicle && (
        <VehicleDetailsModal vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
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
        <VehicleSaleModal vehicle={sellingVehicle} onClose={() => setSellingVehicle(null)} />
      )}

      {undoingSaleVehicle && (
        <VehicleUndoSaleModal vehicle={undoingSaleVehicle} onClose={() => setUndoingSaleVehicle(null)} />
      )}

      {deletingVehicle && (
        <VehicleDeleteModal vehicle={deletingVehicle} onClose={() => setDeletingVehicle(null)} />
      )}
    </div>
  );
};

export default Vehicles;