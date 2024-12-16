import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useRentals } from '../hooks/useRentals';
import { useCustomers } from '../hooks/useCustomers';
import { useRentalFilters } from '../hooks/useRentalFilters';
import { useRentalStatusUpdates } from '../hooks/useRentalStatusUpdates';
import RentalFilters from '../components/rentals/RentalFilters';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Download, Upload, Edit, Trash2, Eye, Clock } from 'lucide-react';
import RentalForm from '../components/rentals/RentalForm';
import RentalEditModal from '../components/rentals/RentalEditModal';
import RentalExtendModal from '../components/rentals/RentalExtendModal';
import RentalDeleteModal from '../components/rentals/RentalDeleteModal';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/StatusBadge';
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

  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        return vehicle ? (
          <div>
            <div className="font-medium">{vehicle.make} {vehicle.model}</div>
            <div className="text-sm text-gray-500">{vehicle.registrationNumber}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Customer',
      cell: ({ row }) => {
        const customer = customers.find(c => c.id === row.original.customerId);
        return customer ? (
          <div>
            <div className="font-medium">{customer.name}</div>
            <div className="text-sm text-gray-500">{customer.mobile}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Type',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.type} />
          {row.original.type === 'weekly' && row.original.numberOfWeeks && (
            <div className="text-sm text-gray-500">{row.original.numberOfWeeks} weeks</div>
          )}
        </div>
      ),
    },
    {
      header: 'Period',
      cell: ({ row }) => (
        <div>
          <div>{format(row.original.startDate, 'MMM dd, yyyy')}</div>
          <div className="text-sm text-gray-500">{format(row.original.endDate, 'MMM dd, yyyy')}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          <StatusBadge status={row.original.paymentStatus} />
        </div>
      ),
    },
    {
      header: 'Cost',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">£{row.original.cost.toFixed(2)}</div>
          {row.original.negotiated && (
            <div className="text-xs text-gray-500">Negotiated rate</div>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRental(row.original);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {(row.original.status === 'hired' || row.original.status === 'claim') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExtendingRental(row.original);
              }}
              className="text-green-600 hover:text-green-800"
              title="Extend Rental"
            >
              <Clock className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingRental(row.original);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeletingRentalId(row.original.id);
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  if (vehiclesLoading || rentalsLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Rentals</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => exportRentals(rentals)}
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

      <DataTable
        data={filteredRentals}
        columns={columns}
        onRowClick={(rental) => setSelectedRental(rental)}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Schedule Rental"
        size="xl"
      >
        <RentalForm
          vehicles={vehicles.filter(v => v.status === 'active')}
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Vehicle</h3>
                <p className="mt-1">
                  {vehicles.find(v => v.id === selectedRental.vehicleId)?.registrationNumber}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Customer</h3>
                <p className="mt-1">
                  {customers.find(c => c.id === selectedRental.customerId)?.name}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Period</h3>
                <p className="mt-1">
                  {format(selectedRental.startDate, 'MMM dd, yyyy')} - {format(selectedRental.endDate, 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Cost</h3>
                <p className="mt-1">£{selectedRental.cost.toFixed(2)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="mt-1">
                  <StatusBadge status={selectedRental.status} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Payment Status</h3>
                <div className="mt-1">
                  <StatusBadge status={selectedRental.paymentStatus} />
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!editingRental}
        onClose={() => setEditingRental(null)}
        title="Edit Rental"
        size="lg"
      >
        {editingRental && (
          <RentalEditModal
            rental={editingRental}
            onClose={() => setEditingRental(null)}
          />
        )}
      </Modal>

      <Modal
        isOpen={!!extendingRental}
        onClose={() => setExtendingRental(null)}
        title="Extend Rental"
        size="lg"
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