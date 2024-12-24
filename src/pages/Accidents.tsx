import React, { useState } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import { useAccidents } from '../hooks/useAccidents';
import { useAccidentFilters } from '../hooks/useAccidentFilters';
import { DataTable } from '../components/DataTable/DataTable';
import { format } from 'date-fns';
import { Plus, Download, Upload, Eye, Trash2 } from 'lucide-react';
import AccidentClaimForm from '../components/accidents/AccidentClaimForm';
import AccidentFilters from '../components/accidents/AccidentFilters';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/StatusBadge';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { exportToExcel } from '../utils/excel';
import { usePermissions } from '../hooks/usePermissions';
import toast from 'react-hot-toast';

const Accidents = () => {
  const { vehicles, loading: vehiclesLoading } = useVehicles();
  const { accidents, loading: accidentsLoading } = useAccidents();
  const { can } = usePermissions();
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    dateRange,
    setDateRange,
    filteredAccidents
  } = useAccidentFilters(accidents);

  const [showForm, setShowForm] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [deletingAccident, setDeletingAccident] = useState(null);

  const handleExport = () => {
    const exportData = accidents.map(accident => ({
      Date: format(accident.date, 'yyyy-MM-dd'),
      Location: accident.location,
      Description: accident.description,
      Status: accident.status,
      Type: accident.type || 'Pending',
      Vehicle: vehicles.find(v => v.id === accident.vehicleId)?.registrationNumber || 'N/A'
    }));

    exportToExcel(exportData, 'accidents');
    toast.success('Accidents exported successfully');
  };

  const handleImport = async (file: File) => {
    // Implement import functionality
  };

  const handleDelete = async (accidentId: string) => {
    try {
      await deleteDoc(doc(db, 'accidents', accidentId));
      toast.success('Accident record deleted successfully');
      setDeletingAccident(null);
    } catch (error) {
      console.error('Error deleting accident:', error);
      toast.error('Failed to delete accident record');
    }
  };

  const columns = [
    {
      header: 'Vehicle',
      cell: ({ row }) => {
        const vehicle = vehicles.find(v => v.id === row.original.vehicleId);
        return vehicle ? (
          <div>
            <div className="font-medium">{vehicle.make} {vehicle.model}</div>
            <div className="text-gray-500">{vehicle.registrationNumber}</div>
          </div>
        ) : 'N/A';
      },
    },
    {
      header: 'Date',
      cell: ({ row }) => format(row.original.date, 'MMM dd, yyyy'),
    },
    {
      header: 'Location',
      accessorKey: 'location',
    },
    {
      header: 'Status',
      cell: ({ row }) => (
        <div className="space-y-1">
          <StatusBadge status={row.original.status} />
          {row.original.type && (
            <StatusBadge status={row.original.type} />
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
              setSelectedAccident(row.original);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          {can('accidents', 'delete') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeletingAccident(row.original);
              }}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  if (vehiclesLoading || accidentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Accidents</h1>
        <div className="flex space-x-2">
          {can('accidents', 'create') && (
            <>
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-5 w-5 mr-2" />
                Export
              </button>
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <Upload className="h-5 w-5 mr-2" />
                Import
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => e.target.files && handleImport(e.target.files[0])}
                />
              </label>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600"
              >
                <Plus className="h-5 w-5 mr-2" />
                Report Accident
              </button>
            </>
          )}
        </div>
      </div>

      <AccidentFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <DataTable
        data={filteredAccidents}
        columns={columns}
        onRowClick={(accident) => setSelectedAccident(accident)}
      />

      {/* Modals */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title="Report Accident"
        size="xl"
      >
        <AccidentClaimForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal
        isOpen={!!selectedAccident}
        onClose={() => setSelectedAccident(null)}
        title="Accident Details"
        size="lg"
      >
        {selectedAccident && (
          <div className="space-y-4">
            {/* Accident details content */}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deletingAccident}
        onClose={() => setDeletingAccident(null)}
        title="Delete Accident Record"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this accident record? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeletingAccident(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => deletingAccident && handleDelete(deletingAccident.id)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Accidents;