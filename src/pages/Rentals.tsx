import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { useCustomers } from '../hooks/useCustomers';
import { useRentalFilters } from '../hooks/useRentalFilters';
import { useRentalStatusUpdates } from '../hooks/useRentalStatusUpdates';
import RentalFilters from '../components/rentals/RentalFilters';
import RentalTable from '../components/rentals/RentalTable';
import RentalForm from '../components/rentals/RentalForm';
import RentalDetails from '../components/rentals/RentalDetails';
import RentalEditModal from '../components/rentals/RentalEditModal';
import RentalExtendModal from '../components/rentals/RentalExtendModal';
import RentalDeleteModal from '../components/rentals/RentalDeleteModal';
import Modal from '../components/ui/Modal';
import { Plus, Download } from 'lucide-react';
import { exportRentals } from '../utils/RentalsExport';
import { Rental } from '../types';
import toast from 'react-hot-toast';

const Rentals = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { rentals, loading: rentalsLoading } = useRentals();
  const { customers, loading: customersLoading } = useCustomers();
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    vehicleFilter,
    setVehicleFilter,
    filteredRentals
  } = useRentalFilters(rentals);

  useRentalStatusUpdates(); // Enable automatic status updates

  const [showForm, setShowForm] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [extendingRental, setExtendingRental] = useState<Rental | null>(null);
  const [deletingRentalId, setDeletingRentalId] = useState<string | null>(null);

  const handleExport = () => {
    try {
      exportRentals(rentals);
      toast.success('Rentals exported successfully');
    } catch (error) {
      console.error('Error exporting rentals:', error);
      toast.error('Failed to export rentals');
    }
  };

  if (vehiclesLoading || rentalsLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter available vehicles
  const availableVehicles = vehicles.filter(v => v.status === 'available');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rentals</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
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
            Schedule Rental
          </button>
        </div>
      </div>

      <RentalFilters
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

      <RentalTable
        rentals={filteredRentals}
        vehicles={vehicles}
        customers={customers}
        onView={setSelectedRental}
        onEdit={setEditingRental}
        onDelete={setDeletingRentalId}
        onExtend={setExtendingRental}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Schedule Rental"
        size="xl"
      >
        <RentalForm
          vehicles={availableVehicles}
          customers={customers}
          onClose={() => setShowForm(false)}
        />
      </Modal>

      <Modal
        isOpen={!!selectedRental}
        onClose={() => setSelectedRental(null)}
        title="Rental Details"
        size="lg"
      >
        {selectedRental && (
          <RentalDetails
            rental={selectedRental}
            vehicle={vehicles.find(v => v.id === selectedRental.vehicleId) || null}
            customer={customers.find(c => c.id === selectedRental.customerId) || null}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!editingRental}
        onClose={() => setEditingRental(null)}
        title="Edit Rental"
      >
        {editingRental && (
          <RentalEditModal
            rental={editingRental}
            vehicles={vehicles}
            customers={customers}
            onClose={() => setEditingRental(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!extendingRental}
        onClose={() => setExtendingRental(null)}
        title="Extend Rental"
      >
        {extendingRental && (
          <RentalExtendModal
            rental={extendingRental}
            onClose={() => setExtendingRental(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!deletingRentalId}
        onClose={() => setDeletingRentalId(null)}
        title="Delete Rental"
      >
        {deletingRentalId && (
          <RentalDeleteModal
            rentalId={deletingRentalId}
            onClose={() => setDeletingRentalId(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Rentals;