import React from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useVehicleFilters } from '../hooks/useVehicleFilters';
import { usePermissions } from '../hooks/usePermissions';
import VehicleTable from '../components/vehicles/VehicleTable';
import VehicleFilters from '../components/vehicles/VehicleFilters';
import VehicleForm from '../components/vehicles/VehicleForm';
import VehicleSaleModal from '../components/vehicles/VehicleSaleModal';
import VehicleDetailsModal from '../components/vehicles/VehicleDetailsModal';
import DeleteConfirmationModal from '../components/ui/DeleteConfirmationModal';
import Modal from '../components/ui/Modal';
import { Vehicle } from '../types';
import { doc, deleteDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Plus, Download } from 'lucide-react';
import { handleVehicleExport } from '../utils/vehicleHelpers';
import { useVehicleStatusTracking } from '../hooks/useVehicleStatusTracking';


const Vehicles = () => {
  useVehicleStatusTracking();
  const { vehicles, loading } = useVehicles();
  const { can } = usePermissions();
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = React.useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = React.useState<Vehicle | null>(null);
  const [sellingVehicle, setSellingVehicle] = React.useState<Vehicle | null>(null);
  const [showForm, setShowForm] = React.useState(false);

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

  const handleDelete = async (vehicle: Vehicle) => {
    if (!can('vehicles', 'delete')) {
      toast.error('You do not have permission to delete vehicles');
      return;
    }

    if (vehicle.status !== 'sold') {
      toast.error('Only sold vehicles can be deleted');
      return;
    }

    try {
      await deleteDoc(doc(db, 'vehicles', vehicle.id));
      toast.success('Vehicle deleted successfully');
      setDeletingVehicle(null);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
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

      if (editingVehicle) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), vehicleData);
      } else {
        await addDoc(collection(db, 'vehicles'), {
          ...vehicleData,
          createdAt: new Date(),
        });
      }

      toast.success(`Vehicle ${editingVehicle ? 'updated' : 'added'} successfully`);
      setEditingVehicle(null);
      setShowForm(false);
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(`Failed to ${editingVehicle ? 'update' : 'add'} vehicle`);
    }
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
          {can('vehicles', 'create') && (
            <>
              <button
                onClick={() => handleVehicleExport(vehicles)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-5 w-5 mr-2" />
                Export
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

      {/* Vehicle Form Modal */}
      <Modal
        isOpen={showForm || !!editingVehicle}
        onClose={() => {
          setShowForm(false);
          setEditingVehicle(null);
        }}
        title={editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
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

      {/* Vehicle Details Modal */}
      <Modal
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        title="Vehicle Details"
      >
        {selectedVehicle && (
          <VehicleDetailsModal
            vehicle={selectedVehicle}
            onClose={() => setSelectedVehicle(null)}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deletingVehicle}
        onClose={() => setDeletingVehicle(null)}
        onConfirm={() => deletingVehicle && handleDelete(deletingVehicle)}
        title="Delete Vehicle"
        message={
          deletingVehicle?.status !== 'sold'
            ? "Only sold vehicles can be deleted. Please mark the vehicle as sold first."
            : "Are you sure you want to delete this vehicle? This action cannot be undone."
        }
      />

      {/* Sale Modal */}
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
    </div>
  );
};

export default Vehicles;